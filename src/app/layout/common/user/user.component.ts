import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { AuthService } from 'app/core/auth/auth.service';
import { ThemeService, ThemeScheme } from 'app/core/theme/theme.service';

@Component({
    selector: 'user',
    templateUrl: './user.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatMenuModule, MatIconModule, MatDividerModule]
})

export class UserComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly scheme = this.themeService.scheme;

  readonly schemeOptions: { value: ThemeScheme; label: string; icon: string }[] = [
    { value: 'light', label: 'Claro', icon: 'heroicons_outline:sun' },
    { value: 'dark', label: 'Oscuro', icon: 'heroicons_outline:moon' },
    { value: 'auto', label: 'Sistema', icon: 'heroicons_outline:computer-desktop' },
  ];

  setScheme(scheme: ThemeScheme): void {
    this.themeService.setScheme(scheme);
  }

  readonly username = this.authService.getUsername();

  private readonly roleLabels: Record<string, string> = {
    admin: 'Administrador',
    premium: 'Premium',
    free: 'Free',
    user: 'Usuario',
  };

  get displayName(): string {
    return this.authService.getFullname() || this.username || 'Mi cuenta';
  }

  get subtitle(): string {
    const roles = (this.authService.getUserRoles() ?? []).map(role => this.roleLabels[role] ?? role);
    const parts = [this.username, ...roles].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Cuenta de Maguey';
  }

  get initials(): string {
    const parts = this.displayName.replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  }

  viewProfile(): void {
    this.router.navigate(['/profile']);
  }

  signOut(): void {
    this.authService.logout();
  }
}
