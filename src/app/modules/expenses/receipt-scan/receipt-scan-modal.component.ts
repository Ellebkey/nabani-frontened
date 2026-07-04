import {
  Component, ChangeDetectionStrategy, inject, signal, DestroyRef,
} from '@angular/core';
import {
  MatDialog, MatDialogRef, MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CameraCaptureComponent } from './components/camera-capture/camera-capture.component';
import { ReceiptDraftVerifyModalComponent } from './components/receipt-draft-verify/receipt-draft-verify-modal.component';
import { ReceiptDraftApiService } from './services/receipt-draft-api.service';
import { ReceiptDraft } from './models/receipt-draft.model';
import { DraftNotificationService } from '@app/layout/common/draft-notification/draft-notification.service';

type ScanStep = 'capture' | 'processing';

@Component({
    selector: 'app-receipt-scan-modal',
    templateUrl: './receipt-scan-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        CameraCaptureComponent,
        ModalShellComponent
    ]
})
export class ReceiptScanModalComponent {
  private readonly dialogRef = inject(MatDialogRef<ReceiptScanModalComponent>);
  private readonly dialog = inject(MatDialog);
  private readonly receiptDraftApi = inject(ReceiptDraftApiService);
  private readonly draftNotificationService = inject(DraftNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentStep = signal<ScanStep>('capture');
  protected readonly errorMessage = signal<string | null>(null);

  protected onPhotoCapture(file: File): void {
    this.currentStep.set('processing');
    this.errorMessage.set(null);

    this.receiptDraftApi.scanToDraft(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (draft) => this.openVerify(draft),
        error: (error) => {
          const backendMsg = error.error?.error?.message || error.error?.message || '';
          this.errorMessage.set(backendMsg || 'No se pudo escanear el recibo. Intenta con una foto más clara.');
          this.currentStep.set('capture');
        },
      });
  }

  protected onCaptureCancelled(): void {
    this.closeDialog();
  }

  protected retryCapture(): void {
    this.currentStep.set('capture');
    this.errorMessage.set(null);
  }

  protected closeDialog(result?: unknown): void {
    this.dialogRef.close(result);
  }

  private openVerify(draft: ReceiptDraft): void {
    this.dialog.open(ReceiptDraftVerifyModalComponent, {
      data: { draft },
      width: '1260px',
      height: '94vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      autoFocus: false,
    }).afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          this.currentStep.set('capture');
          return;
        }
        this.draftNotificationService.refreshCount();
        if (result.complete && result.expense) {
          this.dialogRef.close({ openEdit: true, expense: result.expense });
        } else {
          this.dialogRef.close({ saved: true });
        }
      });
  }
}
