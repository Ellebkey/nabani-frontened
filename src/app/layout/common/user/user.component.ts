import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { AuthService } from 'app/core/auth/auth.service';
import { ThemeService, ThemeScheme } from 'app/core/theme/theme.service';
import { NbInitComponent } from 'app/modules/shared/components/nb-init/nb-init.component';

@Component({
    selector: 'user',
    templateUrl: './user.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatMenuModule, MatIconModule, MatDividerModule, NbInitComponent]
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
    admin: 'Administradora',
    nutriologa: 'Nutrióloga',
    cocina: 'Cocina',
    front_desk: 'Front desk',
    reparto: 'Reparto',
    paciente: 'Paciente',
  };

  get displayName(): string {
    return this.authService.getFullname() || this.username || 'Mi cuenta';
  }

  /** Single role label shown under the name in the topbar (design-spec §3 rolLabel). */
  get roleLabel(): string {
    const roles = this.authService.getUserRoles() ?? [];
    const primary = roles[0];
    return primary ? (this.roleLabels[primary] ?? primary) : 'Cuenta';
  }

  get subtitle(): string {
    const roles = (this.authService.getUserRoles() ?? []).map(role => this.roleLabels[role] ?? role);
    const parts = [this.username, ...roles].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Cuenta de Nabani';
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
