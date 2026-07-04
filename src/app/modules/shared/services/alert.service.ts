
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MagueyAlertService } from '@maguey/components/alert';

export interface AlertConfig {
  message: string;
  type: 'primary' | 'accent' | 'warn' | 'basic' | 'info' | 'success' | 'warning' | 'error';
  // The following fields are always present on emitted alerts: AlertService.show()
  // merges `defaultConfig` (which sets all of them) into every alert it publishes.
  // Callers provide a Partial<AlertConfig>, so they may still omit any of them.
  appearance: 'border' | 'fill' | 'outline' | 'soft';
  dismissible: boolean;
  showIcon: boolean;
  name: string;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private _magueyAlertService = inject(MagueyAlertService);
  private readonly ALERT_NAME = 'globalAlert';

  private defaultConfig: Partial<AlertConfig> = {
    appearance: 'soft',
    dismissible: true,
    showIcon: true,
    name: this.ALERT_NAME,
    duration: 5000
  };

  private currentAlertSubject = new BehaviorSubject<AlertConfig | null>(null);
  currentAlert$ = this.currentAlertSubject.asObservable();

  show(config: Partial<AlertConfig>): void {
    const fullConfig = { ...this.defaultConfig, ...config };
    this.currentAlertSubject.next(fullConfig as any);
    this._magueyAlertService.show(this.ALERT_NAME);

    // Auto dismiss if duration is set
    if (fullConfig.duration && fullConfig.duration > 0) {
      setTimeout(() => {
        this.dismiss();
      }, fullConfig.duration);
    }
  }

  dismiss(): void {
    this._magueyAlertService.dismiss(this.ALERT_NAME);
    this.currentAlertSubject.next(null);
  }

  // Convenience methods
  success(message: string, config: Partial<AlertConfig> = {}): void {
    this.show({ ...config, message, type: 'success' });
  }

  error(message: string, config: Partial<AlertConfig> = {}): void {
    this.show({ ...config, message, type: 'error' });
  }

  warn(message: string, config: Partial<AlertConfig> = {}): void {
    this.show({ ...config, message, type: 'warning' });
  }

  info(message: string, config: Partial<AlertConfig> = {}): void {
    this.show({ ...config, message, type: 'info' });
  }
}
