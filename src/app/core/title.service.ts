import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TitleService {
  private title = inject(Title);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  private readonly baseTitle = 'Nabani';

  init(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => {
          let route = this.activatedRoute;
          let routeTitle = '';

          while (route.firstChild) {
            route = route.firstChild;
          }

          if (route.snapshot.data['title']) {
            routeTitle = route.snapshot.data['title'];
          }

          return routeTitle;
        })
      )
      .subscribe((routeTitle: string) => {
        this.updateTitle(routeTitle);
      });
  }

  private updateTitle(pageTitle: string): void {
    if (pageTitle) {
      const fullTitle = `${this.capitalizeFirst(pageTitle)} - ${this.baseTitle}`;
      this.title.setTitle(fullTitle);
    } else {
      this.title.setTitle(this.baseTitle);
    }
  }

  private capitalizeFirst(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
