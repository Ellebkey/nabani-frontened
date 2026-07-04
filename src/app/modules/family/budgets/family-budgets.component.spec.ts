import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { CategoriesApiService } from '@app/modules/admin/categories-management/services/api/categories-api.service';
import { ICategory } from '@shared/interfaces/common.model';
import { FamilyBudgetsComponent } from './family-budgets.component';
import { BudgetFormModalComponent } from '../modals/budget-form-modal/budget-form-modal.component';
import { FamilyApiService } from '../services/api/family-api.service';
import { FamilyStateService } from '../services/state/family-state.service';
import {
  IBudgetStatus,
  IBudgetStatusRow,
  IExcludedCategory,
  IFamilyBudget,
  IFamilyCategoryRef,
  IPartnership,
  IPartnershipInvite,
  IPartnershipMember
} from '../models/family.model';

const owner: IPartnershipMember = {
  id: 'm-1', userId: 'u-1', role: 'owner', status: 'active', username: 'joel', email: 'joel@test.com'
};
const partner: IPartnershipMember = {
  id: 'm-2', userId: 'u-2', role: 'partner', status: 'active', username: 'ana', email: 'ana@test.com'
};

const excludedCategoriesFixture: IExcludedCategory[] = [
  { categoryId: 99, name: 'Personal' }
];

const partnershipFixture: IPartnership = {
  id: 'p-1',
  name: 'Casa',
  status: 'active',
  members: [owner, partner],
  excludedCategories: excludedCategoriesFixture,
  createdAt: '2026-06-01',
  updatedAt: '2026-06-01'
};

const makeCategory = (id: number, name: string, colorPalette: string | null = null): ICategory => ({
  id, name, colorPalette, enabledTiers: ['free', 'premium'], subcategories: []
});

const createFamilyStateMock = () => ({
  loaded: signal(true),
  loading: signal(false),
  hasPartnership: signal(true),
  partnership: signal<IPartnership | null>(partnershipFixture),
  members: signal<IPartnershipMember[]>([owner, partner]),
  excludedCategories: signal<IExcludedCategory[]>(excludedCategoriesFixture),
  currentMember: signal<IPartnershipMember | null>(owner),
  partnerMember: signal<IPartnershipMember | null>(partner),
  isOwner: signal(true),
  memberNamesById: signal<Record<string, string>>({ 'u-1': 'joel', 'u-2': 'ana' }),
  pendingInvites: signal<IPartnershipInvite[]>([]),
  ensureLoaded: jest.fn(),
  loadInvites: jest.fn(),
  isPremium: jest.fn().mockReturnValue(true),
  setExcludedCategories: jest.fn(),
  revokeInvite: jest.fn(),
  removeMember: jest.fn(),
  dissolve: jest.fn()
});

describe('FamilyBudgetsComponent', () => {
  let fixture: ComponentFixture<FamilyBudgetsComponent>;
  let component: FamilyBudgetsComponent;
  let api: {
    getBudgets: jest.Mock;
    getBudgetStatus: jest.Mock;
    createBudget: jest.Mock;
    updateBudget: jest.Mock;
    deleteBudget: jest.Mock;
  };
  let categoriesApi: { getCategories: jest.Mock };
  let dialog: { open: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };
  let familyState: ReturnType<typeof createFamilyStateMock>;
  let dialogResult: unknown;
  let confirmResult: unknown;

  const budgetFixture: IFamilyBudget = {
    id: 'b-1', categoryId: 1, amount: 1000, periodMonth: '2026-01', createdAt: '2026-01-01', updatedAt: '2026-01-01'
  };

  const hogarRow: IBudgetStatusRow = {
    categoryId: 1, categoryName: 'Hogar', budgeted: 1000, spent: 400, remaining: 600
  };

  const statusFixture: IBudgetStatus = { rows: [hogarRow], totalBudgeted: 1000, totalSpent: 400 };

  // Category 1 is already budgeted, 99 is excluded (personal); 2 and 3 remain budgetable.
  const categoriesFixture: ICategory[] = [
    makeCategory(1, 'Hogar'),
    makeCategory(2, 'Súper', '#22c55e'),
    makeCategory(3, 'Luz'),
    makeCategory(99, 'Personal')
  ];

  beforeEach(() => {
    dialogResult = undefined;
    confirmResult = undefined;

    api = {
      getBudgets: jest.fn().mockReturnValue(of([budgetFixture])),
      getBudgetStatus: jest.fn().mockReturnValue(of(statusFixture)),
      createBudget: jest.fn().mockReturnValue(of(budgetFixture)),
      updateBudget: jest.fn().mockReturnValue(of(budgetFixture)),
      deleteBudget: jest.fn().mockReturnValue(of(void 0))
    };
    categoriesApi = { getCategories: jest.fn().mockReturnValue(of(categoriesFixture)) };
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmResult) })) };
    toast = { success: jest.fn(), error: jest.fn() };
    familyState = createFamilyStateMock();

    TestBed.configureTestingModule({
      imports: [FamilyBudgetsComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: FamilyApiService, useValue: api },
        { provide: CategoriesApiService, useValue: categoriesApi },
        { provide: FamilyStateService, useValue: familyState },
        { provide: MatDialog, useValue: dialog },
        { provide: MagueyConfirmationService, useValue: magueyConfirmation },
        { provide: HotToastService, useValue: toast }
      ]
    });

    // MatDialogModule (imported by the component) provides its own MatDialog,
    // which shadows TestBed-level providers; overrideProvider wins everywhere.
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
  });

  // Two rounds: the fetch effect runs during the first change detection,
  // so a second pass is needed for the fetched data to reach the DOM.
  const flush = (): void => {
    TestBed.flushEffects();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  };

  // Pins the month to January 2026 before the fetch effect first runs.
  const createComponent = (): void => {
    fixture = TestBed.createComponent(FamilyBudgetsComponent);
    component = fixture.componentInstance;
    component['month'].set(new Date(2026, 0, 15));
    flush();
  };

  describe('initial fetch', () => {
    it('should load budgets, status and the category catalog for the pinned period', () => {
      createComponent();

      expect(familyState.ensureLoaded).toHaveBeenCalledTimes(1);
      expect(api.getBudgets).toHaveBeenCalledWith('2026-01');
      expect(api.getBudgetStatus).toHaveBeenCalledWith('2026-01');
      expect(categoriesApi.getCategories).toHaveBeenCalledTimes(1);
      expect(component['budgets']()).toEqual([budgetFixture]);
      expect(component['status']()).toEqual(statusFixture);
      expect(component['allCategories']()).toEqual(categoriesFixture);
      expect(component['loading']()).toBe(false);
    });

    it('should not fetch without a partnership', () => {
      familyState.hasPartnership.set(false);
      familyState.partnership.set(null);

      createComponent();

      expect(api.getBudgets).not.toHaveBeenCalled();
      expect(categoriesApi.getCategories).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Aún no tienes un hogar');
    });

    it('should toast in Spanish and keep an empty catalog when categories fail to load', () => {
      categoriesApi.getCategories.mockReturnValue(throwError(() => ({ status: 500 })));

      createComponent();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar las categorías');
      expect(component['allCategories']()).toEqual([]);
    });

    it('should toast in Spanish and stop loading when the fetch fails', () => {
      api.getBudgets.mockReturnValue(throwError(() => new Error('boom')));
      api.getBudgetStatus.mockReturnValue(throwError(() => new Error('boom')));

      createComponent();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar los presupuestos');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('month header and navigation', () => {
    it('should capitalize the Spanish month label and format periodMonth', () => {
      createComponent();

      expect(component['monthLabel']()).toBe('Enero 2026');
      expect(component['periodMonth']()).toBe('2026-01');
    });

    it('should refetch when going to the previous month without reloading the category catalog', () => {
      createComponent();

      component['previousMonth']();
      flush();

      // 2 calls: one on init (the catalog read is untracked, so its arrival
      // does not re-trigger the effect), plus one refetch for the month change.
      expect(api.getBudgets).toHaveBeenCalledTimes(2);
      expect(api.getBudgets).toHaveBeenLastCalledWith('2025-12');
      expect(api.getBudgetStatus).toHaveBeenLastCalledWith('2025-12');
      expect(categoriesApi.getCategories).toHaveBeenCalledTimes(1);
      expect(component['monthLabel']()).toBe('Diciembre 2025');
    });

    it('should refetch when going to the next month', () => {
      createComponent();

      component['nextMonth']();
      flush();

      expect(api.getBudgets).toHaveBeenLastCalledWith('2026-02');
      expect(component['monthLabel']()).toBe('Febrero 2026');
    });
  });

  describe('derived values', () => {
    it('should compute the total remaining amount', () => {
      createComponent();

      expect(component['totalRemaining']()).toBe(600);
    });

    it('should offer all categories minus the excluded and already-budgeted ones', () => {
      createComponent();

      const available = component['availableCategories']();
      expect(available.map(category => category.categoryId)).toEqual([2, 3]);
      expect(available.map(category => category.name)).toEqual(['Súper', 'Luz']);
    });

    it('should map categories to IFamilyCategoryRef, turning a null colorPalette into undefined', () => {
      createComponent();

      const available = component['availableCategories']();
      expect(available[0]).toEqual({ categoryId: 2, name: 'Súper', colorPalette: '#22c55e' });
      expect(available[1]).toEqual({ categoryId: 3, name: 'Luz', colorPalette: undefined });
    });

    it('should resolve the budget id for a category and null when missing', () => {
      createComponent();

      expect(component['budgetIdForCategory'](1)).toBe('b-1');
      expect(component['budgetIdForCategory'](99)).toBeNull();
    });
  });

  describe('spentPercent', () => {
    it('should compute the spent percentage', () => {
      createComponent();

      expect(component['spentPercent'](hogarRow)).toBe(40);
    });

    it('should cap at 100 when over budget', () => {
      createComponent();

      const overspent: IBudgetStatusRow = { ...hogarRow, spent: 2500, remaining: -1500 };
      expect(component['spentPercent'](overspent)).toBe(100);
    });

    it('should return 0 when the budget is zero', () => {
      createComponent();

      const zeroBudget: IBudgetStatusRow = { ...hogarRow, budgeted: 0, spent: 50, remaining: -50 };
      expect(component['spentPercent'](zeroBudget)).toBe(0);
    });
  });

  describe('create budget modal', () => {
    it('should open the form modal and create the budget for the current period', () => {
      dialogResult = { categoryId: 2, amount: 800 };

      createComponent();
      component['openCreateModal']();

      expect(dialog.open).toHaveBeenCalledWith(BudgetFormModalComponent, expect.objectContaining({
        data: expect.objectContaining({ budget: null, monthLabel: 'Enero 2026' })
      }));
      const dialogData = dialog.open.mock.calls[0][1].data;
      expect(dialogData.availableCategories.map((category: IFamilyCategoryRef) => category.categoryId)).toEqual([2, 3]);

      expect(api.createBudget).toHaveBeenCalledWith({ categoryId: 2, amount: 800, periodMonth: '2026-01' });
      expect(toast.success).toHaveBeenCalledWith('Presupuesto creado exitosamente');
      // 1 init call + 1 refetch after creating.
      expect(api.getBudgets).toHaveBeenCalledTimes(2);
    });

    it('should not create anything when the modal is dismissed', () => {
      dialogResult = undefined;

      createComponent();
      component['openCreateModal']();

      expect(api.createBudget).not.toHaveBeenCalled();
    });

    it.each<[number, string]>([
      [403, 'Necesitas una cuenta Premium para crear presupuestos'],
      [409, 'Ya existe un presupuesto para esa categoría este mes'],
      [422, 'Solo puedes presupuestar categorías del hogar'],
      [500, 'Error al crear el presupuesto']
    ])('should map a %d create error to its Spanish message', (status, message) => {
      dialogResult = { categoryId: 2, amount: 800 };
      api.createBudget.mockReturnValue(throwError(() => ({ status })));

      createComponent();
      component['openCreateModal']();

      expect(toast.error).toHaveBeenCalledWith(message);
      expect(component['loading']()).toBe(false);
    });
  });

  describe('edit budget modal', () => {
    it('should open the form modal with the existing budget and update it', () => {
      dialogResult = { categoryId: 1, amount: 1200 };

      createComponent();
      component['openEditModal'](hogarRow);

      expect(dialog.open).toHaveBeenCalledWith(BudgetFormModalComponent, expect.objectContaining({
        data: expect.objectContaining({
          budget: expect.objectContaining({ id: 'b-1', categoryName: 'Hogar' }),
          availableCategories: []
        })
      }));
      expect(api.updateBudget).toHaveBeenCalledWith('b-1', 1200);
      expect(toast.success).toHaveBeenCalledWith('Presupuesto actualizado exitosamente');
    });

    it('should do nothing when the row has no matching budget', () => {
      createComponent();

      component['openEditModal']({ ...hogarRow, categoryId: 99 });

      expect(dialog.open).not.toHaveBeenCalled();
      expect(api.updateBudget).not.toHaveBeenCalled();
    });

    it('should toast in Spanish when the update fails', () => {
      dialogResult = { categoryId: 1, amount: 1200 };
      api.updateBudget.mockReturnValue(throwError(() => ({ status: 500 })));

      createComponent();
      component['openEditModal'](hogarRow);

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar el presupuesto');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('delete budget', () => {
    it('should confirm in Spanish and delete after confirmation', () => {
      confirmResult = 'confirmed';

      createComponent();
      component['confirmDelete'](hogarRow);

      expect(magueyConfirmation.open).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Eliminar presupuesto',
        message: expect.stringContaining('Hogar')
      }));
      expect(api.deleteBudget).toHaveBeenCalledWith('b-1');
      expect(toast.success).toHaveBeenCalledWith('Presupuesto eliminado');
    });

    it('should not delete when the confirmation is cancelled', () => {
      confirmResult = 'cancelled';

      createComponent();
      component['confirmDelete'](hogarRow);

      expect(api.deleteBudget).not.toHaveBeenCalled();
    });

    it('should not open the confirmation for a row without budget', () => {
      createComponent();

      component['confirmDelete']({ ...hogarRow, categoryId: 99 });

      expect(magueyConfirmation.open).not.toHaveBeenCalled();
    });

    it('should toast in Spanish when the delete fails', () => {
      confirmResult = 'confirmed';
      api.deleteBudget.mockReturnValue(throwError(() => ({ status: 500 })));

      createComponent();
      component['confirmDelete'](hogarRow);

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar el presupuesto');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('empty state copy', () => {
    it('should invite premium users to create a budget', () => {
      api.getBudgets.mockReturnValue(of([]));
      api.getBudgetStatus.mockReturnValue(of({ rows: [], totalBudgeted: 0, totalSpent: 0 }));

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Presupuesta otra categoría');
      expect(text).toContain('Crear presupuesto');
      expect(text).toContain('Nuevo presupuesto');
    });

    it('should tell free users that only the premium owner can create budgets', () => {
      familyState.isPremium.mockReturnValue(false);
      api.getBudgets.mockReturnValue(of([]));
      api.getBudgetStatus.mockReturnValue(of({ rows: [], totalBudgeted: 0, totalSpent: 0 }));

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('El dueño del hogar (Premium) puede crear presupuestos; tú podrás verlos aquí.');
      expect(text).not.toContain('Nuevo presupuesto');
    });
  });
});
