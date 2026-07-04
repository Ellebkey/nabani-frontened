import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MagueyNavigationItem } from '@maguey/components/navigation';
import { ADMIN_ONLY_SECTIONS, menu } from '@app/core/navigation/navigation.menu.data';
import { AuthService } from '@app/core/auth/auth.service';

@Injectable({providedIn: 'root'})
export class NavigationService
{
  private readonly authService = inject(AuthService);

  /** Sidebar sections visible to the current role. Finanzas + Catálogos are
   *  dropped for everyone except admins (design-spec §3, RBAC §8). */
  get(): Observable<MagueyNavigationItem[]> {
    const isAdmin = this.authService.isAdmin();
    const items = isAdmin
      ? menu
      : menu.filter(item => !ADMIN_ONLY_SECTIONS.has(item.id ?? ''));
    return of(items);
  }
}
