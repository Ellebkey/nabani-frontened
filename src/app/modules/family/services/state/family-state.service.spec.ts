import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { FamilyStateService } from './family-state.service';
import { FamilyApiService } from '../api/family-api.service';
import { AuthService } from '@app/core/auth/auth.service';
import { IPartnership } from '../../models/family.model';

describe('FamilyStateService', () => {
  let service: FamilyStateService;
  let api: jest.Mocked<Pick<FamilyApiService,
    'getMyPartnership' | 'createPartnership' | 'getInvites' | 'revokeInvite' |
    'removeMember' | 'dissolvePartnership' | 'setExcludedCategories'>>;
  let toast: { success: jest.Mock; error: jest.Mock };
  let auth: { getUsername: jest.Mock; userHasRole: jest.Mock; isAdmin: jest.Mock };

  const partnership: IPartnership = {
    id: 'p-1',
    name: 'Casa',
    status: 'active',
    members: [
      { id: 'm-1', userId: 'u-1', role: 'owner', status: 'active', username: 'joel', email: 'joel@test.com' },
      { id: 'm-2', userId: 'u-2', role: 'partner', status: 'active', username: 'ana', email: 'ana@test.com' }
    ],
    excludedCategories: [{ categoryId: 1, name: 'Personal' }],
    createdAt: '2026-06-01',
    updatedAt: '2026-06-01'
  };

  beforeEach(() => {
    api = {
      getMyPartnership: jest.fn(),
      createPartnership: jest.fn(),
      getInvites: jest.fn(),
      revokeInvite: jest.fn(),
      removeMember: jest.fn(),
      dissolvePartnership: jest.fn(),
      setExcludedCategories: jest.fn()
    };
    toast = { success: jest.fn(), error: jest.fn() };
    auth = {
      getUsername: jest.fn().mockReturnValue('joel'),
      userHasRole: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        FamilyStateService,
        { provide: FamilyApiService, useValue: api },
        { provide: HotToastService, useValue: toast },
        { provide: AuthService, useValue: auth }
      ]
    });

    service = TestBed.inject(FamilyStateService);
  });

  describe('loadPartnership', () => {
    it('should set the partnership and mark loaded on success', () => {
      api.getMyPartnership.mockReturnValue(of(partnership));

      service.loadPartnership();

      expect(service.partnership()).toEqual(partnership);
      expect(service.hasPartnership()).toBe(true);
      expect(service.loaded()).toBe(true);
      expect(service.loading()).toBe(false);
    });

    it('should treat a null body as no partnership', () => {
      api.getMyPartnership.mockReturnValue(of(null));

      service.loadPartnership();

      expect(service.partnership()).toBeNull();
      expect(service.hasPartnership()).toBe(false);
      expect(service.loaded()).toBe(true);
    });

    it('should toast and still mark loaded on error', () => {
      api.getMyPartnership.mockReturnValue(throwError(() => new Error('boom')));

      service.loadPartnership();

      expect(toast.error).toHaveBeenCalled();
      expect(service.loaded()).toBe(true);
      expect(service.loading()).toBe(false);
    });
  });

  describe('ensureLoaded', () => {
    it('should only hit the API once', () => {
      api.getMyPartnership.mockReturnValue(of(partnership));

      service.ensureLoaded();
      service.ensureLoaded();

      expect(api.getMyPartnership).toHaveBeenCalledTimes(1);
    });
  });

  describe('computed member helpers', () => {
    beforeEach(() => {
      api.getMyPartnership.mockReturnValue(of(partnership));
      service.loadPartnership();
    });

    it('should resolve the current member by username', () => {
      expect(service.currentMember()?.userId).toBe('u-1');
      expect(service.isOwner()).toBe(true);
    });

    it('should resolve the partner member', () => {
      expect(service.partnerMember()?.username).toBe('ana');
    });

    it('should map member names by user id', () => {
      expect(service.memberNamesById()).toEqual({ 'u-1': 'joel', 'u-2': 'ana' });
    });

    it('should not be owner when the current user is the partner', () => {
      auth.getUsername.mockReturnValue('ana');

      expect(service.isOwner()).toBe(false);
    });
  });

  describe('isPremium', () => {
    it('should be true for premium role', () => {
      auth.userHasRole.mockImplementation((role: string) => role === 'premium');
      expect(service.isPremium()).toBe(true);
    });

    it('should be true for admin', () => {
      auth.isAdmin.mockReturnValue(true);
      expect(service.isPremium()).toBe(true);
    });

    it('should be false for free users', () => {
      expect(service.isPremium()).toBe(false);
    });
  });

  describe('createPartnership', () => {
    it('should set the partnership after the server responds', () => {
      api.createPartnership.mockReturnValue(of(partnership));

      service.createPartnership('Casa');

      expect(api.createPartnership).toHaveBeenCalledWith({ name: 'Casa' });
      expect(service.partnership()).toEqual(partnership);
      expect(toast.success).toHaveBeenCalled();
    });

    it('should show the premium message on 403', () => {
      api.createPartnership.mockReturnValue(throwError(() => ({ status: 403 })));

      service.createPartnership();

      expect(toast.error).toHaveBeenCalledWith('Necesitas una cuenta Premium para crear un hogar');
      expect(service.partnership()).toBeNull();
    });
  });

  describe('invites', () => {
    it('should load and filter pending invites', () => {
      api.getInvites.mockReturnValue(of([
        { id: 'i-1', partnershipId: 'p-1', inviteeEmail: 'a@b.c', status: 'pending', createdAt: '' },
        { id: 'i-2', partnershipId: 'p-1', inviteeEmail: 'x@y.z', status: 'accepted', createdAt: '' }
      ]));

      service.loadInvites();

      expect(service.invites()).toHaveLength(2);
      expect(service.pendingInvites()).toHaveLength(1);
      expect(service.pendingInvites()[0].id).toBe('i-1');
    });

    it('should remove a revoked invite from state after the server confirms', () => {
      api.getInvites.mockReturnValue(of([
        { id: 'i-1', partnershipId: 'p-1', inviteeEmail: 'a@b.c', status: 'pending', createdAt: '' }
      ]));
      api.revokeInvite.mockReturnValue(of(void 0));

      service.loadInvites();
      service.revokeInvite('i-1');

      expect(service.invites()).toHaveLength(0);
      expect(toast.success).toHaveBeenCalledWith('Invitación revocada');
    });
  });

  describe('dissolve', () => {
    it('should clear partnership and invites', () => {
      api.getMyPartnership.mockReturnValue(of(partnership));
      api.dissolvePartnership.mockReturnValue(of(void 0));
      service.loadPartnership();

      service.dissolve();

      expect(service.partnership()).toBeNull();
      expect(service.invites()).toHaveLength(0);
    });
  });

  describe('setExcludedCategories', () => {
    it('should update only the excludedCategories of the partnership', () => {
      api.getMyPartnership.mockReturnValue(of(partnership));
      api.setExcludedCategories.mockReturnValue(of([
        { categoryId: 1, name: 'Personal' },
        { categoryId: 2, name: 'Regalos' }
      ]));
      service.loadPartnership();

      service.setExcludedCategories([1, 2]);

      expect(api.setExcludedCategories).toHaveBeenCalledWith([1, 2]);
      expect(service.excludedCategories()).toHaveLength(2);
      expect(service.partnership()?.id).toBe('p-1');
      expect(toast.success).toHaveBeenCalledWith('Categorías personales actualizadas');
    });

    it('should show the owner-only message on 403', () => {
      api.getMyPartnership.mockReturnValue(of(partnership));
      api.setExcludedCategories.mockReturnValue(throwError(() => ({ status: 403 })));
      service.loadPartnership();

      service.setExcludedCategories([2]);

      expect(toast.error).toHaveBeenCalledWith('Solo el dueño puede modificar las categorías personales');
      expect(service.excludedCategories()).toHaveLength(1);
    });
  });

  describe('removeMember', () => {
    it('should reload the partnership after removal', () => {
      api.getMyPartnership.mockReturnValue(of(partnership));
      api.removeMember.mockReturnValue(of(void 0));

      service.removeMember('m-2', false);

      expect(api.removeMember).toHaveBeenCalledWith('m-2');
      expect(api.getMyPartnership).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Miembro eliminado del hogar');
    });

    it('should use the self-leave message when leaving', () => {
      api.getMyPartnership.mockReturnValue(of(null));
      api.removeMember.mockReturnValue(of(void 0));

      service.removeMember('m-2', true);

      expect(toast.success).toHaveBeenCalledWith('Has salido del hogar');
    });
  });

  describe('setPartnership', () => {
    it('should set the partnership directly and mark loaded', () => {
      service.setPartnership(partnership);

      expect(service.partnership()).toEqual(partnership);
      expect(service.hasPartnership()).toBe(true);
      expect(service.loaded()).toBe(true);
      expect(api.getMyPartnership).not.toHaveBeenCalled();
    });

    it('should accept null to clear the partnership and still mark loaded', () => {
      service.setPartnership(partnership);

      service.setPartnership(null);

      expect(service.partnership()).toBeNull();
      expect(service.hasPartnership()).toBe(false);
      expect(service.loaded()).toBe(true);
    });
  });

  describe('invite error paths', () => {
    it('should toast and leave invites empty when loading invites fails', () => {
      api.getInvites.mockReturnValue(throwError(() => new Error('boom')));

      service.loadInvites();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar las invitaciones');
      expect(service.invites()).toHaveLength(0);
    });

    it('should keep the invite in state and toast when revoking fails', () => {
      api.getInvites.mockReturnValue(of([
        { id: 'i-1', partnershipId: 'p-1', inviteeEmail: 'a@b.c', status: 'pending', createdAt: '' }
      ]));
      api.revokeInvite.mockReturnValue(throwError(() => ({ status: 500 })));

      service.loadInvites();
      service.revokeInvite('i-1');

      expect(toast.error).toHaveBeenCalledWith('Error al revocar la invitación');
      expect(toast.success).not.toHaveBeenCalled();
      expect(service.invites()).toHaveLength(1);
      expect(service.invites()[0].id).toBe('i-1');
    });
  });

  describe('removeMember error paths', () => {
    it('should show the owner-cannot-leave message on 422', () => {
      api.removeMember.mockReturnValue(throwError(() => ({ status: 422 })));

      service.removeMember('m-1', true);

      expect(toast.error).toHaveBeenCalledWith('El dueño no puede salir; disuelve el hogar en su lugar');
      expect(service.loading()).toBe(false);
    });

    it('should fall back to the generic message for a non-422 error', () => {
      api.removeMember.mockReturnValue(throwError(() => ({ status: 500 })));

      service.removeMember('m-2', false);

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar el miembro');
      expect(api.getMyPartnership).not.toHaveBeenCalled();
      expect(service.loading()).toBe(false);
    });
  });

  describe('dissolve error paths', () => {
    beforeEach(() => {
      api.getMyPartnership.mockReturnValue(of(partnership));
      service.loadPartnership();
    });

    it('should show the owner-only message on 403 and keep the partnership', () => {
      api.dissolvePartnership.mockReturnValue(throwError(() => ({ status: 403 })));

      service.dissolve();

      expect(toast.error).toHaveBeenCalledWith('Solo el dueño puede disolver el hogar');
      expect(service.partnership()).toEqual(partnership);
      expect(service.loading()).toBe(false);
    });

    it('should fall back to the generic message for a non-403 error', () => {
      api.dissolvePartnership.mockReturnValue(throwError(() => ({ status: 500 })));

      service.dissolve();

      expect(toast.error).toHaveBeenCalledWith('Error al disolver el hogar');
      expect(service.partnership()).toEqual(partnership);
      expect(service.loading()).toBe(false);
    });
  });

  describe('createPartnership error fallback', () => {
    it('should fall back to the generic message for an unmapped status', () => {
      api.createPartnership.mockReturnValue(throwError(() => ({ status: 500 })));

      service.createPartnership('Casa');

      expect(toast.error).toHaveBeenCalledWith('Error al crear el hogar');
      expect(service.partnership()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('computed helpers without a partnership', () => {
    it('should expose safe empty defaults', () => {
      expect(service.members()).toEqual([]);
      expect(service.excludedCategories()).toEqual([]);
      expect(service.currentMember()).toBeNull();
      expect(service.partnerMember()).toBeNull();
      expect(service.isOwner()).toBe(false);
      expect(service.memberNamesById()).toEqual({});
    });

    it('should fall back to "Miembro" when a member has no username', () => {
      service.setPartnership({
        ...partnership,
        members: [
          { id: 'm-3', userId: 'u-3', role: 'partner', status: 'active', email: 'x@y.z' }
        ]
      });

      expect(service.memberNamesById()).toEqual({ 'u-3': 'Miembro' });
    });
  });

  describe('setExcludedCategories edge paths', () => {
    it('should leave the partnership null when the update resolves with no partnership loaded', () => {
      api.setExcludedCategories.mockReturnValue(of([{ categoryId: 2, name: 'Regalos' }]));

      service.setExcludedCategories([2]);

      expect(service.partnership()).toBeNull();
      expect(service.excludedCategories()).toEqual([]);
      expect(toast.success).toHaveBeenCalledWith('Categorías personales actualizadas');
      expect(service.loading()).toBe(false);
    });

    it('should fall back to the generic message for a non-403 error', () => {
      api.setExcludedCategories.mockReturnValue(throwError(() => ({ status: 500 })));

      service.setExcludedCategories([1]);

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar las categorías');
      expect(service.loading()).toBe(false);
    });
  });
});
