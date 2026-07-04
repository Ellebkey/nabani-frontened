import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({providedIn: 'root'})
export class MagueyLoadingService
{
    private readonly _auto$ = new BehaviorSubject<boolean>(true);
    private readonly _mode$ = new BehaviorSubject<'determinate' | 'indeterminate'>('indeterminate');
    private readonly _progress$ = new BehaviorSubject<number>(0);
    private readonly _show$ = new BehaviorSubject<boolean>(false);
    private readonly _pendingUrls = new Set<string>();

    /**
     * Getter for auto mode
     */
    get auto$(): Observable<boolean>
    {
        return this._auto$.asObservable();
    }

    /**
     * Synchronous view of the auto mode (used by the loading interceptor)
     */
    get autoMode(): boolean
    {
        return this._auto$.getValue();
    }

    /**
     * Getter for mode
     */
    get mode$(): Observable<'determinate' | 'indeterminate'>
    {
        return this._mode$.asObservable();
    }

    /**
     * Getter for progress
     */
    get progress$(): Observable<number>
    {
        return this._progress$.asObservable();
    }

    /**
     * Getter for show
     */
    get show$(): Observable<boolean>
    {
        return this._show$.asObservable();
    }

    /**
     * Show the loading bar
     */
    show(): void
    {
        this._show$.next(true);
    }

    /**
     * Hide the loading bar
     */
    hide(): void
    {
        this._show$.next(false);
    }

    /**
     * Set the auto mode
     *
     * @param value
     */
    setAutoMode(value: boolean): void
    {
        this._auto$.next(value);
    }

    /**
     * Set the mode
     *
     * @param value
     */
    setMode(value: 'determinate' | 'indeterminate'): void
    {
        this._mode$.next(value);
    }

    /**
     * Set the progress of the bar manually
     *
     * @param value
     */
    setProgress(value: number): void
    {
        if ( value < 0 || value > 100 )
        {
            console.error('Progress value must be between 0 and 100!');
            return;
        }

        this._progress$.next(value);
    }

    /**
     * Sets the loading status on the given url
     *
     * @param status
     * @param url
     */
    _setLoadingStatus(status: boolean, url: string): void
    {
        if ( !url )
        {
            console.error('The request URL must be provided!');
            return;
        }

        if ( status )
        {
            this._pendingUrls.add(url);
            this._show$.next(true);
        }
        else
        {
            this._pendingUrls.delete(url);
        }

        // Only set the status to 'false' if all outgoing requests are completed
        if ( this._pendingUrls.size === 0 )
        {
            this._show$.next(false);
        }
    }
}
