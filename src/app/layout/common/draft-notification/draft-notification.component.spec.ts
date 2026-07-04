import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { HotToastService } from '@ngxpert/hot-toast';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { DraftNotificationComponent } from './draft-notification.component';
import { DraftListItem, DraftNotificationService } from './draft-notification.service';
import { ExpensesService } from '@app/modules/expenses/expenses.service';
import { ReceiptScanApiService } from '@app/modules/expenses/receipt-scan/services/receipt-scan-api.service';
import { ReceiptDraftApiService } from '@app/modules/expenses/receipt-scan/services/receipt-draft-api.service';
import { ReceiptDraftSummary } from '@app/modules/expenses/receipt-scan/models/receipt-draft.model';
import { ExpensesCreateModalComponent } from '@app/modules/expenses/expenses-create-modal/expenses-create-modal.component';
import { ReceiptDraftVerifyModalComponent } from '@app/modules/expenses/receipt-scan/components/receipt-draft-verify/receipt-draft-verify-modal.component';
import { CommonService } from '@shared/services/common.service';

describe('DraftNotificationComponent', () => {
  let fixture: ComponentFixture<DraftNotificationComponent>;
  let component: DraftNotificationComponent;

  let draftsSubject: BehaviorSubject<DraftListItem[]>;
  let countSubject: BehaviorSubject<number>;
  let receiptDraftsSubject: BehaviorSubject<ReceiptDraftSummary[]>;
  let backdropSubject: Subject<MouseEvent>;

  let draftService: {
    drafts$: unknown;
    count$: unknown;
    receiptDrafts$: unknown;
    refreshCount: jest.Mock;
    loadReceiptDrafts: jest.Mock;
  };
  let expenseService: { getExpenseById: jest.Mock };
  let receiptScanApi: { deleteDraft: jest.Mock };
  let receiptDraftApi: { getById: jest.Mock; delete: jest.Mock };
  let dialog: { open: jest.Mock };
  let toast: { observe: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let common: { getDefaultDeleteConfirmation: jest.Mock };
  let overlayRefMock: { attach: jest.Mock; detach: jest.Mock; dispose: jest.Mock; backdropClick: jest.Mock };
  let positionBuilder: { flexibleConnectedTo: jest.Mock; withLockedPosition: jest.Mock; withPush: jest.Mock; withPositions: jest.Mock };
  let overlayMock: { create: jest.Mock; scrollStrategies: { block: jest.Mock; reposition: jest.Mock }; position: jest.Mock };
  let confirmResult: unknown;

  const draft: DraftListItem = { id: 4, expenseDate: '2026-06-08T10:00:00', totalAmount: 350 };
  const receiptDraft: ReceiptDraftSummary = {
    id: 9, store: 'Costco', expenseDate: '2026-06-09', total: 1280.5, status: 'pending', itemCount: 12
  };
  const deleteConfirmationConfig = { title: 'Remove draft' };

  beforeEach(() => {
    confirmResult = undefined;
    draftsSubject = new BehaviorSubject<DraftListItem[]>([]);
    countSubject = new BehaviorSubject<number>(0);
    receiptDraftsSubject = new BehaviorSubject<ReceiptDraftSummary[]>([]);
    backdropSubject = new Subject<MouseEvent>();

    draftService = {
      drafts$: draftsSubject.asObservable(),
      count$: countSubject.asObservable(),
      receiptDrafts$: receiptDraftsSubject.asObservable(),
      refreshCount: jest.fn(),
      loadReceiptDrafts: jest.fn()
    };
    expenseService = { getExpenseById: jest.fn().mockReturnValue(of({ id: 4 })) };
    receiptScanApi = { deleteDraft: jest.fn().mockReturnValue(of(void 0)) };
    receiptDraftApi = {
      getById: jest.fn().mockReturnValue(of({ id: 9 })),
      delete: jest.fn().mockReturnValue(of(void 0))
    };
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) }) };
    toast = { observe: jest.fn(() => (source: unknown) => source) };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmResult) })) };
    common = { getDefaultDeleteConfirmation: jest.fn().mockReturnValue(deleteConfirmationConfig) };

    overlayRefMock = {
      attach: jest.fn(),
      detach: jest.fn(),
      dispose: jest.fn(),
      backdropClick: jest.fn().mockReturnValue(backdropSubject.asObservable())
    };
    positionBuilder = {
      flexibleConnectedTo: jest.fn().mockReturnThis(),
      withLockedPosition: jest.fn().mockReturnThis(),
      withPush: jest.fn().mockReturnThis(),
      withPositions: jest.fn().mockReturnThis()
    };
    overlayMock = {
      create: jest.fn().mockReturnValue(overlayRefMock),
      scrollStrategies: { block: jest.fn().mockReturnValue('block-strategy'), reposition: jest.fn() },
      position: jest.fn().mockReturnValue(positionBuilder)
    };

    TestBed.configureTestingModule({
      // MatIconTestingModule serves blank icons for the unregistered heroicons set
      imports: [DraftNotificationComponent, MatIconTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: DraftNotificationService, useValue: draftService },
        { provide: ExpensesService, useValue: expenseService },
        { provide: ReceiptScanApiService, useValue: receiptScanApi },
        { provide: ReceiptDraftApiService, useValue: receiptDraftApi },
        { provide: MatDialog, useValue: dialog },
        { provide: HotToastService, useValue: toast },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation },
        { provide: CommonService, useValue: common }
      ]
    });

    // MatTooltipModule (imported by the component) pulls in OverlayModule, which
    // provides its own Overlay in the standalone injector; overrideProvider wins everywhere.
    TestBed.overrideProvider(Overlay, { useValue: overlayMock });

    fixture = TestBed.createComponent(DraftNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('init', () => {
    it('should mirror drafts, count and receipt drafts and refresh on init', () => {
      expect(draftService.refreshCount).toHaveBeenCalledTimes(1);

      draftsSubject.next([draft]);
      countSubject.next(1);
      receiptDraftsSubject.next([receiptDraft]);

      expect(component.drafts).toEqual([draft]);
      expect(component.count).toBe(1);
      expect(component.receiptDrafts).toEqual([receiptDraft]);
    });

    it('should show the amber dot when there are drafts or receipt drafts', () => {
      expect(fixture.nativeElement.querySelector('.bg-amber-bright')).toBeNull();

      countSubject.next(2);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.bg-amber-bright')).not.toBeNull();

      countSubject.next(0);
      receiptDraftsSubject.next([receiptDraft]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.bg-amber-bright')).not.toBeNull();
    });
  });

  describe('panel', () => {
    it('should create the overlay anchored to the toggle button and attach the panel', () => {
      component.openPanel();

      expect(overlayMock.create).toHaveBeenCalledTimes(1);
      expect(overlayMock.create).toHaveBeenCalledWith(expect.objectContaining({
        hasBackdrop: true,
        backdropClass: 'mg-backdrop-on-mobile',
        scrollStrategy: 'block-strategy'
      }));
      expect(positionBuilder.flexibleConnectedTo).toHaveBeenCalledWith(
        fixture.nativeElement.querySelector('button')
      );
      expect(overlayRefMock.attach).toHaveBeenCalledWith(expect.any(TemplatePortal));
    });

    it('should reuse the overlay on subsequent opens', () => {
      component.openPanel();
      component.openPanel();

      expect(overlayMock.create).toHaveBeenCalledTimes(1);
      expect(overlayRefMock.attach).toHaveBeenCalledTimes(2);
    });

    it('should not open when the panel template is missing', () => {
      // viewChild() signals are read-only — stub the query result instead
      jest.spyOn(component as never, 'draftPanel' as never).mockReturnValue(null as never);

      component.openPanel();

      expect(overlayMock.create).not.toHaveBeenCalled();
    });

    it('should detach on closePanel and ignore it when never opened', () => {
      expect(() => component.closePanel()).not.toThrow();
      expect(overlayRefMock.detach).not.toHaveBeenCalled();

      component.openPanel();
      component.closePanel();

      expect(overlayRefMock.detach).toHaveBeenCalledTimes(1);
    });

    it('should detach the overlay on backdrop click', () => {
      component.openPanel();

      backdropSubject.next(new MouseEvent('click'));

      expect(overlayRefMock.detach).toHaveBeenCalledTimes(1);
    });
  });

  describe('openDraft', () => {
    it('should close the panel and open the expense editor in draft mode', () => {
      const fullExpense = { id: 4, totalAmount: 350 };
      expenseService.getExpenseById.mockReturnValue(of(fullExpense));
      dialog.open.mockReturnValue({ afterClosed: () => of({ id: 4 }) });
      component.openPanel();

      component.openDraft(draft);

      expect(overlayRefMock.detach).toHaveBeenCalled();
      expect(expenseService.getExpenseById).toHaveBeenCalledWith(4);
      expect(dialog.open).toHaveBeenCalledWith(ExpensesCreateModalComponent, expect.objectContaining({
        data: { id: 4, totalAmount: 350, isDraft: true },
        disableClose: true
      }));
      // init + after the editor closed with a result
      expect(draftService.refreshCount).toHaveBeenCalledTimes(2);
    });

    it('should not refresh when the editor is dismissed without result', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });

      component.openDraft(draft);

      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(draftService.refreshCount).toHaveBeenCalledTimes(1);
    });

    it('should log and skip the editor when the expense cannot be loaded', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const failure = new Error('offline');
      expenseService.getExpenseById.mockReturnValue(throwError(() => failure));

      component.openDraft(draft);

      expect(consoleSpy).toHaveBeenCalledWith('Error loading draft expense:', failure);
      expect(dialog.open).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('deleteDraft', () => {
    it('should confirm, delete the draft with Spanish toasts and refresh', () => {
      confirmResult = 'confirmed';
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.deleteDraft(event, draft);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(common.getDefaultDeleteConfirmation).toHaveBeenCalledWith({ objectName: 'draft' });
      expect(magueyConfirmation.open).toHaveBeenCalledWith(deleteConfirmationConfig);
      expect(receiptScanApi.deleteDraft).toHaveBeenCalledWith(4);
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Eliminando...',
        success: 'Borrador eliminado',
        error: 'Error al eliminar'
      });
      expect(draftService.refreshCount).toHaveBeenCalledTimes(2);
    });

    it('should not delete when the confirmation is cancelled', () => {
      confirmResult = 'cancelled';
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.deleteDraft(event, draft);

      expect(receiptScanApi.deleteDraft).not.toHaveBeenCalled();
      expect(draftService.refreshCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('openReceiptDraft', () => {
    it('should open the verify modal and chain into the expense editor when completed', () => {
      const fullDraft = { id: 9, store: 'Costco' };
      receiptDraftApi.getById.mockReturnValue(of(fullDraft));
      dialog.open
        .mockReturnValueOnce({ afterClosed: () => of({ complete: true, expense: { id: 77 } }) })
        .mockReturnValueOnce({ afterClosed: () => of(undefined) });
      expenseService.getExpenseById.mockReturnValue(of({ id: 77 }));

      component.openReceiptDraft(receiptDraft);

      expect(receiptDraftApi.getById).toHaveBeenCalledWith(9);
      expect(dialog.open).toHaveBeenNthCalledWith(1, ReceiptDraftVerifyModalComponent, expect.objectContaining({
        data: { draft: fullDraft },
        width: '1260px'
      }));
      expect(draftService.refreshCount).toHaveBeenCalledTimes(2);
      expect(expenseService.getExpenseById).toHaveBeenCalledWith(77);
      expect(dialog.open).toHaveBeenNthCalledWith(2, ExpensesCreateModalComponent, expect.objectContaining({
        data: expect.objectContaining({ id: 77, isDraft: true })
      }));
    });

    it('should refresh without opening the editor when verification is incomplete', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of({ complete: false }) });

      component.openReceiptDraft(receiptDraft);

      expect(draftService.refreshCount).toHaveBeenCalledTimes(2);
      expect(expenseService.getExpenseById).not.toHaveBeenCalled();
    });

    it('should do nothing when the verify modal is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });

      component.openReceiptDraft(receiptDraft);

      expect(draftService.refreshCount).toHaveBeenCalledTimes(1);
      expect(expenseService.getExpenseById).not.toHaveBeenCalled();
    });

    it('should log when the receipt draft cannot be loaded', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const failure = new Error('boom');
      receiptDraftApi.getById.mockReturnValue(throwError(() => failure));

      component.openReceiptDraft(receiptDraft);

      expect(consoleSpy).toHaveBeenCalledWith('Error loading receipt draft:', failure);
      expect(dialog.open).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('deleteReceiptDraft', () => {
    it('should confirm, delete the receipt with Spanish toasts and reload the list', () => {
      confirmResult = 'confirmed';
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.deleteReceiptDraft(event, receiptDraft);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(common.getDefaultDeleteConfirmation).toHaveBeenCalledWith({ objectName: 'draft' });
      expect(receiptDraftApi.delete).toHaveBeenCalledWith(9);
      expect(toast.observe).toHaveBeenCalledWith({
        loading: 'Eliminando...',
        success: 'Recibo eliminado',
        error: 'Error al eliminar'
      });
      expect(draftService.loadReceiptDrafts).toHaveBeenCalledTimes(1);
    });

    it('should not delete when the confirmation is cancelled', () => {
      confirmResult = undefined;
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.deleteReceiptDraft(event, receiptDraft);

      expect(receiptDraftApi.delete).not.toHaveBeenCalled();
      expect(draftService.loadReceiptDrafts).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should dispose the overlay when it was created', () => {
      component.openPanel();

      fixture.destroy();

      expect(overlayRefMock.dispose).toHaveBeenCalledTimes(1);
    });

    it('should not fail when the panel was never opened', () => {
      expect(() => fixture.destroy()).not.toThrow();
      expect(overlayRefMock.dispose).not.toHaveBeenCalled();
    });
  });

  describe('popover helpers and footer actions', () => {
    it('sums pending receipts and drafts, and flags old dates in amber', () => {
      countSubject.next(2);
      receiptDraftsSubject.next([{ id: 1, store: 'Costco', expenseDate: '2026-06-30', total: 1, status: 'pending', itemCount: 3 }]);

      expect(component.pendingCount).toBe(3);
      expect(component.isOldDraft('2020-01-01')).toBe(true);
      expect(component.isOldDraft(new Date().toISOString())).toBe(false);
      expect(component.isOldDraft(null)).toBe(false);
    });

    it('opens the scan modal from the footer and refreshes on close', () => {
      draftService.refreshCount.mockClear();
      dialog.open.mockReturnValue({ afterClosed: () => of(true) });

      component.scanAnotherReceipt();

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ width: '440px' }));
      expect(draftService.refreshCount).toHaveBeenCalled();
    });

    it('navigates to expenses from "Ver todos"', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.goToExpenses();

      expect(navigateSpy).toHaveBeenCalledWith(['/expenses']);
    });
  });

});
