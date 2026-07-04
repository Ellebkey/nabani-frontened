import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';

import { ReceiptScanModalComponent } from './receipt-scan-modal.component';
import { ReceiptDraftVerifyModalComponent } from './components/receipt-draft-verify/receipt-draft-verify-modal.component';
import { ReceiptDraftApiService } from './services/receipt-draft-api.service';
import { DraftNotificationService } from '@app/layout/common/draft-notification/draft-notification.service';
import { ReceiptDraft } from './models/receipt-draft.model';

describe('ReceiptScanModalComponent', () => {
  let fixture: ComponentFixture<ReceiptScanModalComponent>;
  let component: ReceiptScanModalComponent;
  let dialogRef: { close: jest.Mock };
  let dialog: { open: jest.Mock };
  let api: { scanToDraft: jest.Mock };
  let draftNotifications: { refreshCount: jest.Mock };
  let verifyResult: unknown;

  const draft: ReceiptDraft = {
    id: 7,
    store: 'Soriana',
    expenseDate: '2026-06-10',
    total: 100,
    status: 'pending',
    data: { store: 'Soriana', date: '2026-06-10', items: [] }
  };

  const file = new File(['img'], 'receipt.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    verifyResult = undefined;
    dialogRef = { close: jest.fn() };
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(verifyResult) })) };
    api = { scanToDraft: jest.fn() };
    draftNotifications = { refreshCount: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ReceiptScanModalComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatDialog, useValue: dialog },
        { provide: ReceiptDraftApiService, useValue: api },
        { provide: DraftNotificationService, useValue: draftNotifications }
      ]
    });
    TestBed.overrideComponent(ReceiptScanModalComponent, { set: { template: '', imports: [] } });

    fixture = TestBed.createComponent(ReceiptScanModalComponent);
    component = fixture.componentInstance;
  });

  it('should start on the capture step without errors', () => {
    expect(component['currentStep']()).toBe('capture');
    expect(component['errorMessage']()).toBeNull();
  });

  describe('onPhotoCapture', () => {
    it('should switch to processing and send the file to the scan endpoint', () => {
      const scan$ = new Subject<ReceiptDraft>();
      api.scanToDraft.mockReturnValue(scan$);

      component['onPhotoCapture'](file);

      expect(api.scanToDraft).toHaveBeenCalledWith(file);
      expect(component['currentStep']()).toBe('processing');
      expect(component['errorMessage']()).toBeNull();
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('should open the verify modal with the scanned draft', () => {
      api.scanToDraft.mockReturnValue(of(draft));

      component['onPhotoCapture'](file);

      expect(dialog.open).toHaveBeenCalledWith(ReceiptDraftVerifyModalComponent, {
        data: { draft },
        width: '1260px',
        height: '94vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        autoFocus: false
      });
    });

    it('should return to capture when the verify modal is dismissed', () => {
      api.scanToDraft.mockReturnValue(of(draft));
      verifyResult = undefined;

      component['onPhotoCapture'](file);

      expect(component['currentStep']()).toBe('capture');
      expect(draftNotifications.refreshCount).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should refresh the draft count and close as saved when the draft stays pending', () => {
      api.scanToDraft.mockReturnValue(of(draft));
      verifyResult = { saved: true };

      component['onPhotoCapture'](file);

      expect(draftNotifications.refreshCount).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith({ saved: true });
    });

    it('should close requesting the editor when the draft was completed into an expense', () => {
      api.scanToDraft.mockReturnValue(of(draft));
      verifyResult = { complete: true, expense: { id: 99 } };

      component['onPhotoCapture'](file);

      expect(draftNotifications.refreshCount).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith({ openEdit: true, expense: { id: 99 } });
    });

    it('should close as saved when completion comes back without an expense', () => {
      api.scanToDraft.mockReturnValue(of(draft));
      verifyResult = { complete: true };

      component['onPhotoCapture'](file);

      expect(dialogRef.close).toHaveBeenCalledWith({ saved: true });
    });

    it('should surface the nested backend error message and return to capture', () => {
      api.scanToDraft.mockReturnValue(throwError(() => ({ error: { error: { message: 'Imagen ilegible' } } })));

      component['onPhotoCapture'](file);

      expect(component['errorMessage']()).toBe('Imagen ilegible');
      expect(component['currentStep']()).toBe('capture');
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('should surface the flat backend error message', () => {
      api.scanToDraft.mockReturnValue(throwError(() => ({ error: { message: 'Límite de escaneos alcanzado' } })));

      component['onPhotoCapture'](file);

      expect(component['errorMessage']()).toBe('Límite de escaneos alcanzado');
    });

    it('should fall back to the default Spanish error message', () => {
      api.scanToDraft.mockReturnValue(throwError(() => ({})));

      component['onPhotoCapture'](file);

      expect(component['errorMessage']()).toBe('No se pudo escanear el recibo. Intenta con una foto más clara.');
    });
  });

  it('should close the dialog when the capture is cancelled', () => {
    component['onCaptureCancelled']();

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should clear the error and return to capture on retry', () => {
    api.scanToDraft.mockReturnValue(throwError(() => ({})));
    component['onPhotoCapture'](file);
    expect(component['errorMessage']()).not.toBeNull();

    component['retryCapture']();

    expect(component['currentStep']()).toBe('capture');
    expect(component['errorMessage']()).toBeNull();
  });
});
