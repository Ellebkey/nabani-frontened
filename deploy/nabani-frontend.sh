#!/bin/bash
# Droplet deploy script — source of truth for `~/nabani-frontend` on the server.
# The Build-and-Deploy workflow (main.yml) SSHes in and runs this after scp'ing
# frontend.tar.gz (the production `ng build`) to /home/ellebkey/apps/nabani.
# After editing this file, copy it to the droplet:
#   scp deploy/nabani-frontend.sh <user>@<host>:~/nabani-frontend
set -e

DEPLOY_START=$(date +%s)
log() { echo "==> [$(date '+%H:%M:%S')] $1"; }

# nginx matches requests by server_name — talk to it locally with the right Host
SITE_HOST="${SITE_HOST:-nabani.joelbarranco.io}"

# 200 only: a 301 (http→https redirect) must not count as healthy
check_url() {
  local path="$1" code
  code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$SITE_HOST:443:127.0.0.1" "https://$SITE_HOST$path" || true)
  if [ "$code" != "200" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $SITE_HOST" "http://127.0.0.1$path" || true)
  fi
  [ "$code" = "200" ]
}

log "Deploy started"

cd /home/ellebkey/apps/nabani
log "Artifact: $(du -h frontend.tar.gz | cut -f1) frontend.tar.gz"

# Extract NEXT TO the live folder — never into it. The hashed chunk names make
# a partially-copied tree a broken app; the swap below is atomic instead.
rm -rf frontend.new
mkdir frontend.new
tar -xzf frontend.tar.gz -C frontend.new --strip-components=1
rm frontend.tar.gz

# Integrity: index.html must exist and every chunk it references must be there
[ -f frontend.new/index.html ] || { log "index.html missing in artifact — ABORT"; exit 1; }
MISSING=0
for asset in $(grep -oE '(src|href)="[^"]+\.(js|css)"' frontend.new/index.html | cut -d'"' -f2); do
  [ -f "frontend.new/${asset#/}" ] || { log "index.html references missing file: $asset"; MISSING=1; }
done
[ "$MISSING" = "0" ] || { log "Artifact inconsistent — ABORT (live release untouched)"; exit 1; }
log "Artifact verified: $(find frontend.new -type f | wc -l) files, index + chunks consistent"

log "Swapping release (previous kept as frontend.old)"
rm -rf frontend.old
[ -d frontend ] && mv frontend frontend.old
mv frontend.new frontend

# Health check through nginx — fail the pipeline (and roll back) if the site
# doesn't serve the new index and one of its hashed chunks
CHUNK=$(grep -oE 'src="[^"]+\.js"' frontend/index.html | head -1 | cut -d'"' -f2)
log "Health check on $SITE_HOST via 127.0.0.1 (chunk: $CHUNK)"
for i in $(seq 1 5); do
  if check_url "/" && check_url "/${CHUNK#/}"; then
    log "Site is up (responded on attempt $i)"
    log "Deploy finished in $(( $(date +%s) - DEPLOY_START ))s ✔"
    exit 0
  fi
  sleep 2
done

log "Site did NOT respond after 10s — rolling back to frontend.old"
rm -rf frontend.failed
mv frontend frontend.failed
if [ -d frontend.old ]; then
  mv frontend.old frontend
  log "Rollback done (bad release kept as frontend.failed) — deploy FAILED"
else
  log "No previous release to roll back to — deploy FAILED"
fi
exit 1
