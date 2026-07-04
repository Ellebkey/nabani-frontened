import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, throwError } from 'rxjs';

import { SharedSpendingComponent } from './shared-spending.component';
import { FamilyApiService } from '../services/api/family-api.service';
import { FamilyStateService } from '../services/state/family-state.service';
import {
  IExcludedCategory,
  IPartnership,
  IPartnershipInvite,
  IPartnershipMember,
  ISharedSpending,
  ISharedTicket
} from '../models/family.model';

const owner: IPartnershipMember = {
  id: 'm-1', userId: 'u-1', role: 'owner', status: 'active', username: 'joel', email: 'joel@test.com'
};
const partner: IPartnershipMember = {
  id: 'm-2', userId: 'u-2', role: 'partner', status: 'active', username: 'ana', email: 'ana@test.com'
};

const partnershipFixture: IPartnership = {
  id: 'p-1',
  name: 'Casa',
  status: 'active',
  members: [owner, partner],
  excludedCategories: [
    { categoryId: 99, name: 'Personal' }
  ],
  createdAt: '2026-06-01',
  updatedAt: '2026-06-01'
};

const createFamilyStateMock = () => ({
  loaded: signal(true),
  loading: signal(false),
  hasPartnership: signal(true),
  partnership: signal<IPartnership | null>(partnershipFixture),
  members: signal<IPartnershipMember[]>([owner, partner]),
  excludedCategories: signal<IExcludedCategory[]>(partnershipFixture.excludedCategories),
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

describe('SharedSpendingComponent', () => {
  let fixture: ComponentFixture<SharedSpendingComponent>;
  let component: SharedSpendingComponent;
  let api: { getSharedSpending: jest.Mock; getSharedExpenses: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };
  let familyState: ReturnType<typeof createFamilyStateMock>;

  const spendingFixture: ISharedSpending = {
    rows: [
      { categoryId: 1, categoryName: 'Hogar', total: 300 },
      { categoryId: 2, categoryName: 'Súper', total: 120 }
    ],
    total: 420
  };

  const ticketsFixture: ISharedTicket[] = [
    {
      expenseId: 1,
      expenseDate: '2026-01-10',
      userId: 'u-1',
      recipientName: 'Walmart',
      items: [
        { articleId: 11, articleName: 'Foco LED', categoryId: 1, categoryName: 'Hogar', subtotal: 220 },
        { articleId: 12, articleName: 'Detergente', categoryId: 2, categoryName: 'Súper', subtotal: 80 }
      ],
      ticketTotal: 300
    },
    {
      expenseId: 2,
      expenseDate: '2026-01-12',
      userId: 'u-2',
      recipientName: 'Soriana',
      items: [
        { articleId: 22, articleName: 'Fruta', categoryId: 2, categoryName: 'Súper', subtotal: 80 }
      ],
      ticketTotal: 80
    },
    {
      expenseId: 3,
      expenseDate: '2026-01-14',
      userId: 'u-9',
      recipientName: 'CFE',
      items: [
        { articleId: 33, articleName: 'Recibo de luz', categoryId: 2, categoryName: 'Súper', subtotal: 40 }
      ],
      ticketTotal: 40
    }
  ];

  beforeEach(() => {
    api = {
      getSharedSpending: jest.fn().mockReturnValue(of(spendingFixture)),
      getSharedExpenses: jest.fn().mockReturnValue(of(ticketsFixture))
    };
    toast = { success: jest.fn(), error: jest.fn() };
    familyState = createFamilyStateMock();

    TestBed.configureTestingModule({
      imports: [SharedSpendingComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: FamilyApiService, useValue: api },
        { provide: FamilyStateService, useValue: familyState },
        { provide: HotToastService, useValue: toast }
      ]
    });
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
    fixture = TestBed.createComponent(SharedSpendingComponent);
    component = fixture.componentInstance;
    component['month'].set(new Date(2026, 0, 15));
    flush();
  };

  it('should ask the family state to load itself on construction', () => {
    createComponent();

    expect(familyState.ensureLoaded).toHaveBeenCalledTimes(1);
  });

  describe('month header', () => {
    it('should capitalize the Spanish month label', () => {
      createComponent();

      expect(component['monthLabel']()).toBe('Enero 2026');
    });

    it('should format periodMonth as yyyy-MM', () => {
      createComponent();

      expect(component['periodMonth']()).toBe('2026-01');
    });
  });

  describe('initial fetch', () => {
    it('should load spending and tickets for the current period', () => {
      createComponent();

      expect(api.getSharedSpending).toHaveBeenCalledWith('2026-01');
      expect(api.getSharedExpenses).toHaveBeenCalledWith('2026-01');
      expect(component['spending']()).toEqual(spendingFixture);
      expect(component['tickets']()).toEqual(ticketsFixture);
      expect(component['loading']()).toBe(false);
    });

    it('should not fetch while the partnership is still loading', () => {
      familyState.loaded.set(false);

      createComponent();

      expect(api.getSharedSpending).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('mg-row-skeleton')).toBeTruthy();
    });

    it('should not fetch and show the empty state without a partnership', () => {
      familyState.hasPartnership.set(false);
      familyState.partnership.set(null);

      createComponent();

      expect(api.getSharedSpending).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Aún no tienes un hogar');
    });

    it('should toast in Spanish and stop loading when the fetch fails', () => {
      api.getSharedSpending.mockReturnValue(throwError(() => new Error('boom')));
      api.getSharedExpenses.mockReturnValue(throwError(() => new Error('boom')));

      createComponent();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar los gastos compartidos');
      expect(component['loading']()).toBe(false);
      expect(component['spending']()).toEqual({ rows: [], total: 0 });
    });
  });

  describe('month navigation', () => {
    it('should refetch with the previous periodMonth', () => {
      createComponent();

      component['previousMonth']();
      flush();

      expect(api.getSharedSpending).toHaveBeenCalledTimes(2);
      expect(api.getSharedSpending).toHaveBeenLastCalledWith('2025-12');
      expect(api.getSharedExpenses).toHaveBeenLastCalledWith('2025-12');
      expect(component['monthLabel']()).toBe('Diciembre 2025');
    });

    it('should refetch with the next periodMonth', () => {
      createComponent();

      component['nextMonth']();
      flush();

      expect(api.getSharedSpending).toHaveBeenLastCalledWith('2026-02');
      expect(component['monthLabel']()).toBe('Febrero 2026');
    });
  });

  describe('maxCategoryTotal', () => {
    it('should be the highest category total', () => {
      createComponent();

      expect(component['maxCategoryTotal']()).toBe(300);
    });

    it('should fall back to 1 when there are no rows (no division by -Infinity)', () => {
      api.getSharedSpending.mockReturnValue(of({ rows: [], total: 0 }));
      api.getSharedExpenses.mockReturnValue(of([]));

      createComponent();

      expect(component['maxCategoryTotal']()).toBe(1);
      expect(component['hasMovements']()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('No hay gastos compartidos en este mes.');
      expect(fixture.nativeElement.textContent).toContain('Sin movimientos compartidos este mes.');
    });
  });

  describe('member attribution', () => {
    it('should derive myUserId from the current member', () => {
      createComponent();

      expect(component['myUserId']()).toBe('u-1');
    });

    it('should fall back to an empty id when there is no current member', () => {
      createComponent();
      familyState.currentMember.set(null);

      expect(component['myUserId']()).toBe('');
    });

    it('should label ticket headers as Tú, the partner name, or Pareja for unknown users', () => {
      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Tú');
      expect(text).toContain('ana');
      expect(text).toContain('Pareja');
    });
  });

  describe('ticket rendering', () => {
    it('should render one group per ticket with recipient, date and total', () => {
      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Walmart');
      expect(text).toContain('Soriana');
      expect(text).toContain('CFE');
      expect(text).toContain('10 de');
      expect(text).toContain('300.00');
      expect(text).toContain('80.00');
    });

    it('should render the item rows with article name, category and subtotal after expanding', () => {
      createComponent();

      const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mg-transaction-row');
      rows.forEach(row => row.click());
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Foco LED');
      expect(text).toContain('Detergente');
      expect(text).toContain('Fruta');
      expect(text).toContain('Recibo de luz');
      expect(text).toContain('Hogar');
      expect(text).toContain('Súper');
      expect(text).toContain('220.00');
      expect(text).toContain('40.00');
    });
  });
});
