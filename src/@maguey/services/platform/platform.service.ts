import { Platform } from '@angular/cdk/platform';
import { inject, Injectable } from '@angular/core';

@Injectable({providedIn: 'root'})
export class MagueyPlatformService
{
    private readonly _platform = inject(Platform);

    readonly osName = this._resolveOsName();

    private _resolveOsName(): string
    {
        if ( !this._platform.isBrowser )
        {
            return 'os-unknown';
        }

        // Highest-precedence checks first (mirrors the original last-wins chain)
        if ( this._platform.ANDROID )
        {
            return 'os-android';
        }

        if ( this._platform.IOS )
        {
            return 'os-ios';
        }

        const userAgent = navigator.userAgent;

        if ( userAgent.includes('Linux') )
        {
            return 'os-linux';
        }

        if ( userAgent.includes('X11') )
        {
            return 'os-unix';
        }

        if ( userAgent.includes('Mac') )
        {
            return 'os-mac';
        }

        if ( userAgent.includes('Win') )
        {
            return 'os-windows';
        }

        return 'os-unknown';
    }
}
