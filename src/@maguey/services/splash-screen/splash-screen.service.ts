import { DOCUMENT, inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';

@Injectable({providedIn: 'root'})
export class MagueySplashScreenService
{
    private readonly _document = inject(DOCUMENT);
    private readonly _router = inject(Router);

    constructor()
    {
        // Hide it on the first NavigationEnd event
        this._router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                take(1),
            )
            .subscribe(() => this.hide());
    }

    /**
     * Show the splash screen
     */
    show(): void
    {
        this._document.body.classList.remove('mg-splash-screen-hidden');
    }

    /**
     * Hide the splash screen
     */
    hide(): void
    {
        this._document.body.classList.add('mg-splash-screen-hidden');
    }
}
