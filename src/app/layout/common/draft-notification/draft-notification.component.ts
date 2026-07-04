import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject, TemplateRef, ViewContainerRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule, MatButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subject, takeUntil } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { MagueyConfirmationService } from '@root/@maguey/services/confirmation';
import { DraftNotificationService, DraftListItem } from './draft-notification.service';
import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { ReceiptScanApiService } from '@app/modules/expenses/receipt-scan/services/receipt-scan-api.service';
import { ExpensesCreateModalComponent } from '@app/modules/expenses/expenses-create-modal/expenses-create-modal.component';
import { CommonService } from '@shared/services/common.service';
import { ReceiptDraftApiService } from '@app/modules/expenses/receipt-scan/services/receipt-draft-api.service';
import { ReceiptDraftSummary } from '@app/modules/expenses/receipt-scan/models/receipt-draft.model';
import { ReceiptDraftVerifyModalComponent } from '@app/modules/expenses/receipt-scan/components/receipt-draft-verify/receipt-draft-verify-modal.component';
import { ReceiptScanModalComponent } from '@app/modules/expenses/receipt-scan/receipt-scan-modal.component';
import { Router } from '@angular/router';
import { PillComponent } from '@shared/components/pill/pill.component';
import { TileComponent } from '@shared/components/tile/tile.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

@Component({
    selector: 'draft-notification',
    templateUrl: './draft-notification.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        PillComponent,
        TileComponent,
        EmptyStateComponent,
    ]
})
export class DraftNotificationComponent implements OnInit, OnDestroy {
  private readonly draftOrigin = viewChild<MatButton>('draftOrigin');
  private readonly draftPanel = viewChild<TemplateRef<unknown>>('draftPanel');

  private readonly draftService = inject(DraftNotificationService);
  private readonly expenseService = inject(ExpensesService);
  private readonly receiptScanApi = inject(ReceiptScanApiService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly toast = inject(HotToastService);
  private readonly magueyConfirmationService = inject(MagueyConfirmationService);
  private readonly common = inject(CommonService);
  private readonly receiptDraftApi = inject(ReceiptDraftApiService);
  private readonly router = inject(Router);

  private overlayRef!: OverlayRef;
  private readonly destroy$ = new Subject<void>();

  drafts: DraftListItem[] = [];
  count = 0;
  receiptDrafts: ReceiptDraftSummary[] = [];

  get pendingCount(): number {
    return this.receiptDrafts.length + this.count;
  }

  isOldDraft(date: string | null | undefined): boolean {
    if (!date) {
      return false;
    }
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(date).getTime() > THIRTY_DAYS;
  }

  scanAnotherReceipt(): void {
    this.closePanel();
    this.dialog.open(ReceiptScanModalComponent, {
      width: '440px',
      maxWidth: '100vw',
      maxHeight: '100vh',
      disableClose: true,
    }).afterClosed().subscribe(() => {
      this.draftService.refreshCount();
    });
  }

  goToExpenses(): void {
    this.closePanel();
    this.router.navigate(['/expenses']);
  }

  ngOnInit(): void {
    this.draftService.drafts$
      .pipe(takeUntil(this.destroy$))
      .subscribe((drafts) => {
        this.drafts = drafts;
        this.changeDetectorRef.markForCheck();
      });

    this.draftService.count$
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.count = count;
        this.changeDetectorRef.markForCheck();
      });

    this.draftService.receiptDrafts$
      .pipe(takeUntil(this.destroy$))
      .subscribe((receiptDrafts) => {
        this.receiptDrafts = receiptDrafts;
        this.changeDetectorRef.markForCheck();
      });

    this.draftService.refreshCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.overlayRef) {
      this.overlayRef.dispose();
    }
  }

  openPanel(): void {
    const draftPanel = this.draftPanel();
    if (!draftPanel || !this.draftOrigin()) {
      return;
    }

    if (!this.overlayRef) {
      this.createOverlay();
    }

    this.overlayRef.attach(new TemplatePortal(draftPanel, this.viewContainerRef));
  }

  closePanel(): void {
    if (this.overlayRef) {
      this.overlayRef.detach();
    }
  }

  openDraft(draft: DraftListItem): void {
    this.closePanel();
    this.openExpenseEditor(draft.id);
  }

  private openExpenseEditor(expenseId: number): void {
    this.expenseService.getExpenseById(expenseId).subscribe({
      next: (fullExpense) => {
        const dialogRef = this.dialog.open(ExpensesCreateModalComponent, {
          data: { ...fullExpense, isDraft: true },
          maxWidth: '100vw',
          maxHeight: '100vh',
          disableClose: true,
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.draftService.refreshCount();
          }
        });
      },
      error: (error) => {
        console.error('Error loading draft expense:', error);
      },
    });
  }

  deleteDraft(event: Event, draft: DraftListItem): void {
    event.stopPropagation();

    const dialogData = this.common.getDefaultDeleteConfirmation({ objectName: 'draft' });
    this.magueyConfirmationService.open(dialogData).afterClosed().subscribe((result) => {
      if (result !== 'confirmed') {
        return;
      }

      this.receiptScanApi.deleteDraft(draft.id)
        .pipe(
          this.toast.observe({
            loading: 'Eliminando...',
            success: 'Borrador eliminado',
            error: 'Error al eliminar'
          })
        )
        .subscribe({
          next: () => {
            this.draftService.refreshCount();
          }
        });
    });
  }

  openReceiptDraft(draft: ReceiptDraftSummary): void {
    this.closePanel();
    this.receiptDraftApi.getById(draft.id).subscribe({
      next: (full) => {
        const dialogRef = this.dialog.open(ReceiptDraftVerifyModalComponent, {
          data: { draft: full },
          width: '1260px',
          height: '94vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          autoFocus: false,
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (!result) {
            return;
          }
          this.draftService.refreshCount();
          if (result.complete && result.expense) {
            this.openExpenseEditor(result.expense.id);
          }
        });
      },
      error: (error) => console.error('Error loading receipt draft:', error),
    });
  }

  deleteReceiptDraft(event: Event, draft: ReceiptDraftSummary): void {
    event.stopPropagation();

    const dialogData = this.common.getDefaultDeleteConfirmation({ objectName: 'draft' });
    this.magueyConfirmationService.open(dialogData).afterClosed().subscribe((result) => {
      if (result !== 'confirmed') {
        return;
      }

      this.receiptDraftApi.delete(draft.id)
        .pipe(
          this.toast.observe({
            loading: 'Eliminando...',
            success: 'Recibo eliminado',
            error: 'Error al eliminar',
          }),
        )
        .subscribe({
          next: () => this.draftService.loadReceiptDrafts(),
        });
    });
  }

  private createOverlay(): void {
    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'mg-backdrop-on-mobile',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay.position()
        .flexibleConnectedTo(this.draftOrigin()!._elementRef.nativeElement)
        .withLockedPosition(true)
        .withPush(true)
        .withPositions([
          { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
          { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        ]),
    });

    this.overlayRef.backdropClick().subscribe(() => {
      this.overlayRef.detach();
    });
  }
}
