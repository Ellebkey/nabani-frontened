import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';
import { of, Subject, throwError } from 'rxjs';

import { AcceptInviteComponent } from './accept-invite.component';
import { FamilyApiService } from '../services/api/family-api.service';
import { FamilyStateService } from '../services/state/family-state.service';
import { IPartnership } from '../models/family.model';

const VALID_TOKEN = 'tok-1234567890';

describe('AcceptInviteComponent', () => {
  let api: { acceptInvite: jest.Mock };
  let familyState: { setPartnership: jest.Mock };
  let router: { navigate: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };

  const partnership: IPartnership = {
    id: 'p-1',
    name: 'Casa',
    status: 'active',
    members: [
      { id: 'm-1', userId: 'u-1', role: 'owner', status: 'active', username: 'joel' },
      { id: 'm-2', userId: 'u-2', role: 'partner', status: 'active', username: 'ana' }
    ],
    excludedCategories: [],
    createdAt: '2026-06-01',
    updatedAt: '2026-06-01'
  };

  function setup(queryParams: Record<string, string>): ComponentFixture<AcceptInviteComponent> {
    api = { acceptInvite: jest.fn() };
    familyState = { setPartnership: jest.fn() };
    router = { navigate: jest.fn() };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AcceptInviteComponent],
      providers: [
        provideNoopAnimations(),
        { provide: FamilyApiService, useValue: api },
        { provide: FamilyStateService, useValue: familyState },
        { provide: Router, useValue: router },
        { provide: HotToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } }
        }
      ]
    });

    const fixture = TestBed.createComponent(AcceptInviteComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('token prefill', () => {
    it('should prefill the token control from the route query param', () => {
      const fixture = setup({ token: VALID_TOKEN });

      expect(fixture.componentInstance['tokenControl'].value).toBe(VALID_TOKEN);
      expect(fixture.componentInstance['tokenControl'].valid).toBe(true);
    });

    it('should start empty and invalid when the URL has no token', () => {
      const fixture = setup({});
      const control = fixture.componentInstance['tokenControl'];

      expect(control.value).toBe('');
      expect(control.invalid).toBe(true);

      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);
    });

    it('should reject tokens shorter than 10 characters', () => {
      const fixture = setup({ token: 'short' });

      expect(fixture.componentInstance['tokenControl'].invalid).toBe(true);

      fixture.componentInstance['acceptInvite']();
      expect(api.acceptInvite).not.toHaveBeenCalled();
    });
  });

  describe('acceptInvite success', () => {
    it('should accept with the trimmed token, store the partnership and navigate', () => {
      const fixture = setup({ token: VALID_TOKEN });
      api.acceptInvite.mockReturnValue(of(partnership));

      fixture.componentInstance['tokenControl'].setValue(`  ${VALID_TOKEN}  `);
      fixture.componentInstance['acceptInvite']();

      expect(api.acceptInvite).toHaveBeenCalledWith(VALID_TOKEN);
      expect(familyState.setPartnership).toHaveBeenCalledWith(partnership);
      expect(toast.success).toHaveBeenCalledWith('¡Bienvenido al hogar!');
      expect(router.navigate).toHaveBeenCalledWith(['/family/spending']);
    });

    it('should ignore a second click while the request is in flight', () => {
      const fixture = setup({ token: VALID_TOKEN });
      api.acceptInvite.mockReturnValue(new Subject<IPartnership>());

      fixture.componentInstance['acceptInvite']();
      fixture.componentInstance['acceptInvite']();

      expect(api.acceptInvite).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['accepting']()).toBe(true);
    });
  });

  describe('acceptInvite errors', () => {
    it.each([
      [404, 'Invitación no válida o revocada'],
      [409, 'Ya perteneces a un hogar activo'],
      [422, 'La invitación expiró o el hogar ya está completo'],
      [500, 'Error al aceptar la invitación']
    ])('should toast the mapped message for status %s', (status, message) => {
      const fixture = setup({ token: VALID_TOKEN });
      api.acceptInvite.mockReturnValue(throwError(() => ({ status })));

      fixture.componentInstance['acceptInvite']();

      expect(toast.error).toHaveBeenCalledWith(message);
      expect(familyState.setPartnership).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should re-enable the form after a failure', () => {
      const fixture = setup({ token: VALID_TOKEN });
      api.acceptInvite
        .mockReturnValueOnce(throwError(() => ({ status: 404 })))
        .mockReturnValueOnce(of(partnership));

      fixture.componentInstance['acceptInvite']();
      expect(fixture.componentInstance['accepting']()).toBe(false);

      fixture.componentInstance['acceptInvite']();
      expect(api.acceptInvite).toHaveBeenCalledTimes(2);
      expect(router.navigate).toHaveBeenCalledWith(['/family/spending']);
    });
  });

  it('should render the Spanish invite copy', () => {
    const fixture = setup({ token: VALID_TOKEN });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Aceptar invitación');
    expect(text).toContain('Código de invitación');
    expect(text).toContain('Unirme al hogar');
  });
});
