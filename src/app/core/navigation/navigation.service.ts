import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MagueyNavigationItem } from '@maguey/components/navigation';
import { menu } from '@app/core/navigation/navigation.menu.data';
import { AuthService } from '@app/core/auth/auth.service';

@Injectable({providedIn: 'root'})
export class NavigationService
{
  private readonly authService = inject(AuthService);

  get(): Observable<MagueyNavigationItem[]> {
    return of(this.applyRoleRestrictions(menu));
  }

  private applyRoleRestrictions(items: MagueyNavigationItem[]): MagueyNavigationItem[] {
    return items.map(item => {
      if (!item.children) return item;
      return {
        ...item,
        children: item.children.map(child => {
          if (child.id === 'admin.categories') {
            return { ...child, hidden: () => !this.authService.isAdmin() };
          }
          return child;
        })
      };
    });
  }
}
