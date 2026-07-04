import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { HotToastService } from '@ngxpert/hot-toast';
import { Subject, of, throwError } from 'rxjs';

import { CategoriesApiService } from '@app/modules/admin/categories-management/services/api/categories-api.service';
import { ICategory } from '@shared/interfaces/common.model';
import { FamilySettingsComponent } from './family-settings.component';
import { InviteLinkModalComponent } from '../modals/invite-link-modal/invite-link-modal.component';
import { FamilyApiService } from '../services/api/family-api.service';
import { FamilyStateService } from '../services/state/family-state.service';
import {
  IExcludedCategory,
  IPartnership,
  IPartnershipInvite,
  IPartnershipInviteCreated,
  IPartnershipMember
} from '../models/family.model';

const owner: IPartnershipMember = {
  id: 'm-1', userId: 'u-1', role: 'owner', status: 'active', username: 'joel', email: 'joel@test.com'
};
const partner: IPartnershipMember = {
  id: 'm-2', userId: 'u-2', role: 'partner', status: 'active', username: 'ana', email: 'ana@test.com'
};

const excludedCategoriesFixture: IExcludedCategory[] = [
  { categoryId: 1, name: 'Personal' },
  { categoryId: 2, name: 'Regalos' }
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

const makeCategory = (id: number, name: string): ICategory => ({
  id, name, colorPalette: null, enabledTiers: ['free', 'premium'], subcategories: []
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

describe('FamilySettingsComponent', () => {
  let fixture: ComponentFixture<FamilySettingsComponent>;
  let component: FamilySettingsComponent;
  let familyApi: { createInvite: jest.Mock };
  let categoriesApi: { getCategories: jest.Mock };
  let categories$: Subject<ICategory[]>;
  let dialog: { open: jest.Mock };
  let magueyConfirmation: { open: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };
  let familyState: ReturnType<typeof createFamilyStateMock>;
  let confirmResult: unknown;

  const categoriesFixture: ICategory[] = [
    makeCategory(1, 'Personal'),
    makeCategory(2, 'Regalos'),
    makeCategory(3, 'Luz')
  ];

  beforeEach(() => {
    confirmResult = undefined;
    categories$ = new Subject<ICategory[]>();

    familyApi = { createInvite: jest.fn() };
    // Categories arrive asynchronously (Subject) because the component subscribes inside an effect.
    categoriesApi = { getCategories: jest.fn(() => categories$) };
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(undefined) })) };
    magueyConfirmation = { open: jest.fn(() => ({ afterClosed: () => of(confirmResult) })) };
    toast = { success: jest.fn(), error: jest.fn() };
    familyState = createFamilyStateMock();

    TestBed.configureTestingModule({
      imports: [FamilySettingsComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: FamilyApiService, useValue: familyApi },
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

  // Two rounds so state written by effects during the first change
  // detection reaches the DOM.
  const flush = (): void => {
    TestBed.flushEffects();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  };

  const createComponent = (): void => {
    fixture = TestBed.createComponent(FamilySettingsComponent);
    component = fixture.componentInstance;
    flush();
  };

  describe('initialization', () => {
    it('should load invites and categories once the partnership is available', () => {
      createComponent();
      categories$.next(categoriesFixture);

      expect(familyState.ensureLoaded).toHaveBeenCalledTimes(1);
      expect(familyState.loadInvites).toHaveBeenCalledTimes(1);
      expect(categoriesApi.getCategories).toHaveBeenCalledTimes(1);
      expect(component['allCategories']()).toEqual(categoriesFixture);
      expect(fixture.nativeElement.textContent).toContain('Casa');
    });

    it('should sync the selected categories with the excluded categories from state', () => {
      createComponent();

      expect([...component['selectedCategoryIds']()].sort()).toEqual([1, 2]);
      expect(component['categoriesDirty']()).toBe(false);
    });

    it('should render the shared-categories card copy and mark excluded chips with a lock', () => {
      createComponent();
      categories$.next(categoriesFixture);
      flush();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Categorías compartidas');
      expect(text).toContain('Las categorías con candado son personales y sus gastos nunca se comparten');

      const excludedChip: HTMLElement = fixture.nativeElement.querySelector('button.rounded-full.bg-rose-tint');
      expect(excludedChip).not.toBeNull();
      expect(excludedChip.textContent).toContain('Personal');
      expect(excludedChip.querySelector('mat-icon')).not.toBeNull();

      const sharedChips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('button.bg-brand-tint'));
      const luzChip = sharedChips.find(chip => chip.textContent?.includes('Luz'));
      expect(luzChip).toBeDefined();
      expect(luzChip!.querySelector('mat-icon')).toBeNull();
    });

    it('should not load anything without a partnership', () => {
      familyState.hasPartnership.set(false);
      familyState.partnership.set(null);

      createComponent();

      expect(familyState.loadInvites).not.toHaveBeenCalled();
      expect(categoriesApi.getCategories).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Aún no tienes un hogar');
    });

    it('should toast in Spanish when categories fail to load', () => {
      createComponent();
      categories$.error({ status: 500 });

      expect(toast.error).toHaveBeenCalledWith('Error al cargar las categorías');
      expect(component['allCategories']()).toEqual([]);
    });
  });

  describe('canInvite', () => {
    it('should be false when the household is already complete', () => {
      createComponent();

      expect(component['canInvite']()).toBe(false);
    });

    it('should be true for an owner alone in the household', () => {
      familyState.members.set([owner]);

      createComponent();

      expect(component['canInvite']()).toBe(true);
    });

    it('should be false for a non-owner', () => {
      familyState.members.set([partner]);
      familyState.isOwner.set(false);

      createComponent();

      expect(component['canInvite']()).toBe(false);
    });
  });

  describe('member helpers', () => {
    it('should build uppercase initials from the fullname or username and fall back to ?', () => {
      createComponent();

      expect(component['memberInitials'](owner)).toBe('J');
      expect(component['memberInitials']({ ...owner, fullname: 'Joel Barranco' })).toBe('JB');
      expect(component['memberInitials']({ ...owner, username: undefined })).toBe('M');
    });

    it('should detect the current user as self', () => {
      createComponent();

      expect(component['isSelf'](owner)).toBe(true);
      expect(component['isSelf'](partner)).toBe(false);
    });
  });

  describe('excluded (personal) categories editing', () => {
    it('should mark dirty when the owner toggles a new category and clean when reverted', () => {
      createComponent();

      component['toggleCategory'](3);
      expect(component['selectedCategoryIds']().has(3)).toBe(true);
      expect(component['categoriesDirty']()).toBe(true);

      component['toggleCategory'](3);
      expect(component['categoriesDirty']()).toBe(false);
    });

    it('should mark dirty when the selection has the same size but different ids', () => {
      createComponent();

      component['toggleCategory'](2);
      component['toggleCategory'](3);

      expect(component['selectedCategoryIds']().size).toBe(2);
      expect(component['categoriesDirty']()).toBe(true);
    });

    it('should ignore toggles from non-owners', () => {
      createComponent();
      familyState.isOwner.set(false);

      component['toggleCategory'](3);

      expect([...component['selectedCategoryIds']()].sort()).toEqual([1, 2]);
      expect(component['categoriesDirty']()).toBe(false);
    });

    it('should send the selected ids to the state on save', () => {
      createComponent();

      component['toggleCategory'](3);
      component['saveExcludedCategories']();

      expect(familyState.setExcludedCategories).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should re-sync the selection when the state excluded categories change', () => {
      createComponent();
      component['toggleCategory'](3);

      familyState.excludedCategories.set([...excludedCategoriesFixture, { categoryId: 3, name: 'Luz' }]);
      flush();

      expect([...component['selectedCategoryIds']()].sort()).toEqual([1, 2, 3]);
      expect(component['categoriesDirty']()).toBe(false);
    });
  });

  describe('sendInvite', () => {
    const inviteCreated: IPartnershipInviteCreated = {
      id: 'i-1',
      partnershipId: 'p-1',
      inviteeEmail: 'pareja@test.com',
      status: 'pending',
      createdAt: '2026-06-10',
      token: 'tok-123'
    };

    it('should create the invite and open the link modal with token and email', () => {
      familyApi.createInvite.mockReturnValue(of(inviteCreated));

      createComponent();
      component['inviteEmail'].setValue('pareja@test.com');
      component['sendInvite']();

      expect(familyApi.createInvite).toHaveBeenCalledWith('pareja@test.com');
      expect(component['sendingInvite']()).toBe(false);
      expect(component['inviteEmail'].value).toBe('');
      expect(familyState.loadInvites).toHaveBeenCalledTimes(2);
      expect(dialog.open).toHaveBeenCalledWith(InviteLinkModalComponent, expect.objectContaining({
        data: { token: 'tok-123', email: 'pareja@test.com' }
      }));
    });

    it('should not call the API with an invalid email', () => {
      createComponent();

      component['inviteEmail'].setValue('not-an-email');
      component['sendInvite']();

      expect(familyApi.createInvite).not.toHaveBeenCalled();
    });

    it('should not send twice while a request is in flight', () => {
      createComponent();

      component['inviteEmail'].setValue('pareja@test.com');
      component['sendingInvite'].set(true);
      component['sendInvite']();

      expect(familyApi.createInvite).not.toHaveBeenCalled();
    });

    it.each<[number, string]>([
      [403, 'Solo el dueño (Premium) puede enviar invitaciones'],
      [422, 'El hogar ya está completo'],
      [500, 'Error al crear la invitación']
    ])('should map a %d error to its Spanish message and keep the modal closed', (status, message) => {
      familyApi.createInvite.mockReturnValue(throwError(() => ({ status })));

      createComponent();
      component['inviteEmail'].setValue('pareja@test.com');
      component['sendInvite']();

      expect(toast.error).toHaveBeenCalledWith(message);
      expect(component['sendingInvite']()).toBe(false);
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });

  describe('invites and membership actions', () => {
    it('should delegate invite revocation to the state', () => {
      createComponent();

      component['revokeInvite']('i-1');

      expect(familyState.revokeInvite).toHaveBeenCalledWith('i-1');
    });

    it('should remove the partner after confirming with the remove copy', () => {
      confirmResult = 'confirmed';

      createComponent();
      component['confirmRemoveMember'](partner);

      expect(magueyConfirmation.open).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Eliminar miembro',
        message: expect.stringContaining('ana')
      }));
      expect(familyState.removeMember).toHaveBeenCalledWith('m-2', false);
    });

    it('should use the leave copy when removing yourself', () => {
      confirmResult = 'confirmed';

      createComponent();
      component['confirmRemoveMember'](owner);

      expect(magueyConfirmation.open).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Salir del hogar'
      }));
      expect(familyState.removeMember).toHaveBeenCalledWith('m-1', true);
    });

    it('should not remove anyone when the confirmation is cancelled', () => {
      confirmResult = 'cancelled';

      createComponent();
      component['confirmRemoveMember'](partner);

      expect(familyState.removeMember).not.toHaveBeenCalled();
    });

    it('should dissolve the household only after confirmation', () => {
      confirmResult = 'confirmed';

      createComponent();
      component['confirmDissolve']();

      expect(magueyConfirmation.open).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Disolver hogar'
      }));
      expect(familyState.dissolve).toHaveBeenCalledTimes(1);
    });

    it('should not dissolve when the confirmation is cancelled', () => {
      confirmResult = 'cancelled';

      createComponent();
      component['confirmDissolve']();

      expect(familyState.dissolve).not.toHaveBeenCalled();
    });
  });
});
