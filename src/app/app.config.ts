import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PreloadAllModules, provideRouter, withHashLocation, withPreloading } from '@angular/router';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { es as esFNS } from 'date-fns/locale';
import esMX from '@angular/common/locales/es-MX';

import { appRoutes } from './app.routing';
import { TokenInterceptorService } from './core/auth/token-interceptor.service';
import { provideIcons } from './core/icons/icons.provider';
import { provideMaguey } from '../@maguey';
import { environment } from '../environments/environment';

registerLocaleData(esMX);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(appRoutes, withPreloading(PreloadAllModules), withHashLocation()),

    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true },
    { provide: LOCALE_ID, useValue: 'es-MX' },

    { provide: DateAdapter, useClass: DateFnsAdapter },
    { provide: MAT_DATE_LOCALE, useValue: esFNS },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: 'yyyy-MM-dd',
        },
        display: {
          dateInput: 'dd MMMM, yyyy',
          monthYearLabel: 'MMMM yyyy',
          dateA11yLabel: 'PP',
          monthYearA11yLabel: 'MMMM yyyy',
        },
      },
    },
    // Weeks start on Sunday across every datepicker
    provideAppInitializer(() => {
      inject(DateAdapter).setLocale({
        ...esFNS,
        options: { weekStartsOn: 0 },
      });
    }),

    provideIcons(),
    provideMaguey({
      maguey: {
        layout: 'compact',
        scheme: 'light',
        screens: {
          sm: '600px',
          md: '960px',
          lg: '1280px',
          xl: '1440px',
        },
        theme: environment.theme,
        themes: [
          { id: 'theme-default', name: 'Default' },
          { id: 'theme-maguey', name: 'Maguey' },
        ],
      },
    }),
  ],
};
