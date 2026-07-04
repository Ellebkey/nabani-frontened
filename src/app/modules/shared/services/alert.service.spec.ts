import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { MagueyAlertService } from '@maguey/components/alert';

import { AlertService, AlertConfig } from './alert.service';

describe('AlertService', () => {
  let service: AlertService;
  let maguey: { show: jest.Mock; dismiss: jest.Mock };
  let latest: AlertConfig | null | undefined;

  beforeEach(() => {
    maguey = { show: jest.fn(), dismiss: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AlertService,
        { provide: MagueyAlertService, useValue: maguey }
      ]
    });

    service = TestBed.inject(AlertService);
    latest = undefined;
    service.currentAlert$.subscribe(value => (latest = value));
  });

  it('should start with no current alert', () => {
    expect(latest).toBeNull();
  });

  describe('show', () => {
    it('should merge defaults, emit the alert and show it through Maguey', fakeAsync(() => {
      service.show({ message: 'Gasto guardado', type: 'success' });

      expect(latest).toEqual({
        appearance: 'soft',
        dismissible: true,
        showIcon: true,
        name: 'globalAlert',
        duration: 5000,
        message: 'Gasto guardado',
        type: 'success'
      });
      expect(maguey.show).toHaveBeenCalledWith('globalAlert');

      flush();
    }));

    it('should let the caller override the defaults', fakeAsync(() => {
      service.show({
        message: 'Cuidado',
        type: 'warning',
        appearance: 'fill',
        dismissible: false,
        showIcon: false,
        duration: 0
      });

      expect(latest).toEqual({
        appearance: 'fill',
        dismissible: false,
        showIcon: false,
        name: 'globalAlert',
        duration: 0,
        message: 'Cuidado',
        type: 'warning'
      });
    }));

    it('should auto-dismiss after the default 5 seconds', fakeAsync(() => {
      service.show({ message: 'Hola', type: 'info' });

      tick(4999);
      expect(maguey.dismiss).not.toHaveBeenCalled();
      expect(latest).not.toBeNull();

      tick(1);
      expect(maguey.dismiss).toHaveBeenCalledWith('globalAlert');
      expect(latest).toBeNull();
    }));

    it('should honor a custom duration', fakeAsync(() => {
      service.show({ message: 'Rápido', type: 'info', duration: 1000 });

      tick(999);
      expect(maguey.dismiss).not.toHaveBeenCalled();

      tick(1);
      expect(maguey.dismiss).toHaveBeenCalledWith('globalAlert');
    }));

    it('should never auto-dismiss when duration is 0', fakeAsync(() => {
      service.show({ message: 'Persistente', type: 'error', duration: 0 });

      tick(60000);

      expect(maguey.dismiss).not.toHaveBeenCalled();
      expect(latest).toMatchObject({ message: 'Persistente', type: 'error' });
    }));
  });

  describe('dismiss', () => {
    it('should dismiss through Maguey and clear the current alert', () => {
      service.dismiss();

      expect(maguey.dismiss).toHaveBeenCalledWith('globalAlert');
      expect(latest).toBeNull();
    });
  });

  describe('convenience methods', () => {
    it('success() should emit a success alert', () => {
      service.success('Operación exitosa', { duration: 0 });

      expect(latest).toMatchObject({ message: 'Operación exitosa', type: 'success' });
      expect(maguey.show).toHaveBeenCalledWith('globalAlert');
    });

    it('error() should emit an error alert', () => {
      service.error('Algo salió mal', { duration: 0 });

      expect(latest).toMatchObject({ message: 'Algo salió mal', type: 'error' });
    });

    it('warn() should map to the warning type', () => {
      service.warn('Revisa los datos', { duration: 0 });

      expect(latest).toMatchObject({ message: 'Revisa los datos', type: 'warning' });
    });

    it('info() should emit an info alert', () => {
      service.info('Dato informativo', { duration: 0 });

      expect(latest).toMatchObject({ message: 'Dato informativo', type: 'info' });
    });

    it('should not let the extra config override the method type', () => {
      service.success('Listo', { type: 'error', duration: 0 } as Partial<AlertConfig>);

      expect(latest).toMatchObject({ message: 'Listo', type: 'success' });
    });

    it('should keep extra config values like appearance', () => {
      service.error('Falló la carga', { appearance: 'outline', duration: 0 });

      expect(latest).toMatchObject({
        message: 'Falló la carga',
        type: 'error',
        appearance: 'outline',
        name: 'globalAlert'
      });
    });
  });

  describe('convenience methods without the optional config', () => {
    const defaults = {
      appearance: 'soft',
      dismissible: true,
      showIcon: true,
      name: 'globalAlert',
      duration: 5000
    };

    it('success() should apply every default', fakeAsync(() => {
      service.success('Operación exitosa');

      expect(latest).toEqual({ ...defaults, message: 'Operación exitosa', type: 'success' });
      expect(maguey.show).toHaveBeenCalledWith('globalAlert');

      flush();
    }));

    it('error() should apply every default', fakeAsync(() => {
      service.error('Algo salió mal');

      expect(latest).toEqual({ ...defaults, message: 'Algo salió mal', type: 'error' });
      expect(maguey.show).toHaveBeenCalledWith('globalAlert');

      flush();
    }));

    it('warn() should apply every default with the warning type', fakeAsync(() => {
      service.warn('Revisa los datos');

      expect(latest).toEqual({ ...defaults, message: 'Revisa los datos', type: 'warning' });
      expect(maguey.show).toHaveBeenCalledWith('globalAlert');

      flush();
    }));

    it('info() should apply every default', fakeAsync(() => {
      service.info('Dato informativo');

      expect(latest).toEqual({ ...defaults, message: 'Dato informativo', type: 'info' });
      expect(maguey.show).toHaveBeenCalledWith('globalAlert');

      flush();
    }));

    it('should auto-dismiss with the default duration when no config is given', fakeAsync(() => {
      service.success('Guardado');

      tick(5000);

      expect(maguey.dismiss).toHaveBeenCalledWith('globalAlert');
      expect(latest).toBeNull();
    }));
  });
});
