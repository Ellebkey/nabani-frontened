import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ENVIRONMENT_INITIALIZER, EnvironmentProviders, importProvidersFrom, inject, Provider } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MagueyConfig } from '@maguey/services/config';
import { MAGUEY_CONFIG } from '@maguey/services/config/config.constants';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { magueyLoadingInterceptor, MagueyLoadingService } from '@maguey/services/loading';
import { MagueyMediaWatcherService } from '@maguey/services/media-watcher';
import { MagueyPlatformService } from '@maguey/services/platform';
import { MagueySplashScreenService } from '@maguey/services/splash-screen';
import { MagueyUtilsService } from '@maguey/services/utils';

export type MagueyProviderConfig = {
    maguey?: MagueyConfig
}

/**
 * Maguey provider
 */
export const provideMaguey = (config: MagueyProviderConfig): Array<Provider | EnvironmentProviders> =>
{
    // Base providers
    const providers: Array<Provider | EnvironmentProviders> = [
        {
            // Use the 'fill' appearance on Angular Material form fields by default
            provide : MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: {
                appearance: 'fill',
            },
        },
        {
            provide : MAGUEY_CONFIG,
            useValue: config?.maguey ?? {},
        },

        importProvidersFrom(MatDialogModule),
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(MagueyConfirmationService),
            multi   : true,
        },

        provideHttpClient(withInterceptors([magueyLoadingInterceptor])),
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(MagueyLoadingService),
            multi   : true,
        },

        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(MagueyMediaWatcherService),
            multi   : true,
        },
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(MagueyPlatformService),
            multi   : true,
        },
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(MagueySplashScreenService),
            multi   : true,
        },
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(MagueyUtilsService),
            multi   : true,
        },
    ];

    // Return the providers
    return providers;
};
