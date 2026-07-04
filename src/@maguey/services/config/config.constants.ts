import { InjectionToken } from '@angular/core';
import { MagueyConfig } from '@maguey/services/config/config.types';

export const MAGUEY_CONFIG = new InjectionToken<MagueyConfig>('MAGUEY_APP_CONFIG');
