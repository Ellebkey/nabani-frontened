import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MagueyConfigService } from '@maguey/services/config';
import { map, Observable, ReplaySubject, switchMap } from 'rxjs';

export interface MagueyMediaChange
{
    matchingAliases: string[];
    matchingQueries: Record<string, string>;
}

@Injectable({providedIn: 'root'})
export class MagueyMediaWatcherService
{
    private readonly _breakpointObserver = inject(BreakpointObserver);
    private readonly _magueyConfigService = inject(MagueyConfigService);

    private readonly _onMediaChange = new ReplaySubject<MagueyMediaChange>(1);

    constructor()
    {
        this._magueyConfigService.config$
            .pipe(
                map(config => Object.fromEntries(
                    Object.entries(config.screens).map(([alias, screen]) => [alias, `(min-width: ${screen})`]),
                )),
                switchMap(screens => this._breakpointObserver.observe(Object.values(screens)).pipe(
                    map(state => this._buildMediaChange(screens, state)),
                )),
                takeUntilDestroyed(),
            )
            .subscribe(change => this._onMediaChange.next(change));
    }

    /**
     * Getter for _onMediaChange
     */
    get onMediaChange$(): Observable<MagueyMediaChange>
    {
        return this._onMediaChange.asObservable();
    }

    /**
     * On media query change
     *
     * @param query
     */
    onMediaQueryChange$(query: string | string[]): Observable<BreakpointState>
    {
        return this._breakpointObserver.observe(query);
    }

    private _buildMediaChange(screens: Record<string, string>, state: BreakpointState): MagueyMediaChange
    {
        const matchingAliases: string[] = [];
        const matchingQueries: Record<string, string> = {};

        for ( const [query, matches] of Object.entries(state.breakpoints) )
        {
            if ( !matches )
            {
                continue;
            }

            // Find the alias of the matching query
            const matchingAlias = Object.entries(screens).find(([, q]) => q === query)?.[0];

            if ( matchingAlias )
            {
                matchingAliases.push(matchingAlias);
                matchingQueries[matchingAlias] = query;
            }
        }

        return { matchingAliases, matchingQueries };
    }
}
