import { inject, Injectable } from '@angular/core';
import { MAGUEY_CONFIG } from '@maguey/services/config/config.constants';
import { MagueyConfig } from '@maguey/services/config/config.types';
import { merge } from 'lodash-es';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({providedIn: 'root'})
export class MagueyConfigService
{
    private readonly _config = new BehaviorSubject<MagueyConfig>(inject(MAGUEY_CONFIG));
    private readonly _defaultConfig = this._config.getValue();

    /**
     * Setter & getter for config
     */
    set config(value: Partial<MagueyConfig>)
    {
        // Merge the new config over to the current config
        const config = merge({}, this._config.getValue(), value);

        this._config.next(config);
    }

    get config$(): Observable<MagueyConfig>
    {
        return this._config.asObservable();
    }

    /**
     * Resets the config to the default
     */
    reset(): void
    {
        this._config.next(this._defaultConfig);
    }
}
