import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class MagueyAlertService
{
    private readonly _onDismiss = new ReplaySubject<string>(1);
    private readonly _onShow = new ReplaySubject<string>(1);

    /**
     * Getter for onDismiss
     */
    get onDismiss(): Observable<string>
    {
        return this._onDismiss.asObservable();
    }

    /**
     * Getter for onShow
     */
    get onShow(): Observable<string>
    {
        return this._onShow.asObservable();
    }

    /**
     * Dismiss the alert
     *
     * @param name
     */
    dismiss(name: string): void
    {
        if ( !name )
        {
            return;
        }

        this._onDismiss.next(name);
    }

    /**
     * Show the dismissed alert
     *
     * @param name
     */
    show(name: string): void
    {
        if ( !name )
        {
            return;
        }

        this._onShow.next(name);
    }
}
