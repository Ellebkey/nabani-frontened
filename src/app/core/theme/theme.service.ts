import { Injectable, inject, signal } from '@angular/core';
import { MagueyConfigService } from '@maguey/services/config';

export type ThemeScheme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'scheme';

/**
 * App theme (dark-mode.html §4): light · dark · system.
 * Persisted in localStorage; defaults to respecting prefers-color-scheme
 * (Maguey already resolves scheme 'auto' against the media query).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly magueyConfigService = inject(MagueyConfigService);

  private readonly schemeSignal = signal<ThemeScheme>(this.readStoredScheme());
  readonly scheme = this.schemeSignal.asReadonly();

  init(): void {
    this.magueyConfigService.config = { scheme: this.schemeSignal() };
  }

  setScheme(scheme: ThemeScheme): void {
    this.schemeSignal.set(scheme);
    localStorage.setItem(STORAGE_KEY, scheme);
    this.magueyConfigService.config = { scheme };
  }

  /** Effective scheme: resolves 'auto' against the system preference. */
  resolvedScheme(): 'light' | 'dark' {
    const scheme = this.schemeSignal();
    if (scheme !== 'auto') {
      return scheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /** Explicitly toggles light/dark (topbar quick button). */
  toggle(): void {
    this.setScheme(this.resolvedScheme() === 'dark' ? 'light' : 'dark');
  }

  private readStoredScheme(): ThemeScheme {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
  }
}
