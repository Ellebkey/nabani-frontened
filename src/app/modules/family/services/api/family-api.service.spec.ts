import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { FamilyApiService } from './family-api.service';
import { environment } from '@root/environments/environment';
import {
  IPartnership,
  IPartnershipInvite,
  IPartnershipInviteCreated,
  IExcludedCategory,
  ISharedSpending,
  ISharedTicket,
  IFamilyBudget,
  IBudgetStatus
} from '../../models/family.model';

describe('FamilyApiService', () => {
  let service: FamilyApiService;
  let httpMock: HttpTestingController;

  const API = environment.url;

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

  const invite: IPartnershipInvite = {
    id: 'i-1',
    partnershipId: 'p-1',
    inviteeEmail: 'ana@test.com',
    status: 'pending',
    expiresAt: '2026-06-17',
    createdAt: '2026-06-10'
  };

  const budget: IFamilyBudget = {
    id: 'b-1',
    categoryId: 1,
    categoryName: 'Hogar',
    amount: 600,
    periodMonth: '2026-06',
    createdAt: '2026-06-01',
    updatedAt: '2026-06-01'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FamilyApiService]
    });

    service = TestBed.inject(FamilyApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('partnership endpoints', () => {
    it('should GET /partnerships/me', () => {
      let result: IPartnership | null | undefined;
      service.getMyPartnership().subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships/me`);
      expect(req.request.method).toBe('GET');
      req.flush(partnership);

      expect(result).toEqual(partnership);
    });

    it('should pass through a null body when there is no partnership', () => {
      let result: IPartnership | null | undefined;
      service.getMyPartnership().subscribe(r => (result = r));

      httpMock.expectOne(`${API}/partnerships/me`).flush(null);

      expect(result).toBeNull();
    });

    it('should POST /partnerships with the name payload', () => {
      let result: IPartnership | undefined;
      service.createPartnership({ name: 'Casa' }).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Casa' });
      req.flush(partnership);

      expect(result).toEqual(partnership);
    });

    it('should DELETE /partnerships/me on dissolve', () => {
      let completed = false;
      service.dissolvePartnership().subscribe({ complete: () => (completed = true) });

      const req = httpMock.expectOne(`${API}/partnerships/me`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBe(true);
    });
  });

  describe('invite endpoints', () => {
    it('should GET /partnerships/invites', () => {
      let result: IPartnershipInvite[] | undefined;
      service.getInvites().subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships/invites`);
      expect(req.request.method).toBe('GET');
      req.flush([invite]);

      expect(result).toEqual([invite]);
    });

    it('should POST /partnerships/invites with the email', () => {
      const created: IPartnershipInviteCreated = { ...invite, token: 'tok-secret-123' };
      let result: IPartnershipInviteCreated | undefined;
      service.createInvite('ana@test.com').subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships/invites`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'ana@test.com' });
      req.flush(created);

      expect(result?.token).toBe('tok-secret-123');
    });

    it('should DELETE /partnerships/invites/:id on revoke', () => {
      service.revokeInvite('i-1').subscribe();

      const req = httpMock.expectOne(`${API}/partnerships/invites/i-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should POST the token to /partnerships/invites/accept', () => {
      let result: IPartnership | undefined;
      service.acceptInvite('tok-secret-123').subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships/invites/accept`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'tok-secret-123' });
      req.flush(partnership);

      expect(result).toEqual(partnership);
    });

    it('should surface HTTP errors to the subscriber', () => {
      let status: number | undefined;
      service.acceptInvite('tok-bad').subscribe({ error: e => (status = e.status) });

      httpMock.expectOne(`${API}/partnerships/invites/accept`)
        .flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });

      expect(status).toBe(404);
    });
  });

  describe('member endpoints', () => {
    it('should DELETE /partnerships/members/:memberId', () => {
      service.removeMember('m-2').subscribe();

      const req = httpMock.expectOne(`${API}/partnerships/members/m-2`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('excluded categories endpoints', () => {
    it('should GET /partnerships/excluded-categories', () => {
      let result: IExcludedCategory[] | undefined;
      service.getExcludedCategories().subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships/excluded-categories`);
      expect(req.request.method).toBe('GET');
      req.flush([{ categoryId: 1, name: 'Personal' }]);

      expect(result).toEqual([{ categoryId: 1, name: 'Personal' }]);
    });

    it('should PUT the categoryIds to /partnerships/excluded-categories', () => {
      let result: IExcludedCategory[] | undefined;
      service.setExcludedCategories([1, 2]).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships/excluded-categories`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ categoryIds: [1, 2] });
      req.flush([
        { categoryId: 1, name: 'Personal' },
        { categoryId: 2, name: 'Regalos' }
      ]);

      expect(result).toHaveLength(2);
    });
  });

  describe('shared spending endpoints', () => {
    it('should GET /partnerships/shared/spending with the periodMonth param', () => {
      const spending: ISharedSpending = {
        rows: [{ categoryId: 1, categoryName: 'Hogar', total: 1200 }],
        total: 1200
      };
      let result: ISharedSpending | undefined;
      service.getSharedSpending('2026-06').subscribe(r => (result = r));

      const req = httpMock.expectOne(r => r.url === `${API}/partnerships/shared/spending`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('periodMonth')).toBe('2026-06');
      req.flush(spending);

      expect(result).toEqual(spending);
    });

    it('should GET /partnerships/shared/expenses with the periodMonth param and pass through tickets', () => {
      const tickets: ISharedTicket[] = [{
        expenseId: 10,
        expenseDate: '2026-05-05',
        userId: 'u-1',
        recipientName: 'Walmart',
        items: [
          { articleId: 5, articleName: 'Despensa', categoryId: 1, categoryName: 'Hogar', subtotal: 350 },
          { articleId: 6, articleName: 'Fruta', categoryId: 2, categoryName: 'Súper', subtotal: 120 }
        ],
        ticketTotal: 470
      }];
      let result: ISharedTicket[] | undefined;
      service.getSharedExpenses('2026-05').subscribe(r => (result = r));

      const req = httpMock.expectOne(r => r.url === `${API}/partnerships/shared/expenses`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('periodMonth')).toBe('2026-05');
      req.flush(tickets);

      expect(result).toEqual(tickets);
    });
  });

  describe('budget endpoints', () => {
    it('should GET /partnerships/budgets with the periodMonth param', () => {
      let result: IFamilyBudget[] | undefined;
      service.getBudgets('2026-06').subscribe(r => (result = r));

      const req = httpMock.expectOne(r => r.url === `${API}/partnerships/budgets`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('periodMonth')).toBe('2026-06');
      req.flush([budget]);

      expect(result).toEqual([budget]);
    });

    it('should POST /partnerships/budgets with the create payload', () => {
      let result: IFamilyBudget | undefined;
      service.createBudget({ categoryId: 1, amount: 600, periodMonth: '2026-06' }).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships/budgets`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ categoryId: 1, amount: 600, periodMonth: '2026-06' });
      req.flush(budget);

      expect(result).toEqual(budget);
    });

    it('should PUT only the amount to /partnerships/budgets/:id', () => {
      let result: IFamilyBudget | undefined;
      service.updateBudget('b-1', 750).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${API}/partnerships/budgets/b-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ amount: 750 });
      req.flush({ ...budget, amount: 750 });

      expect(result?.amount).toBe(750);
    });

    it('should DELETE /partnerships/budgets/:id', () => {
      service.deleteBudget('b-1').subscribe();

      const req = httpMock.expectOne(`${API}/partnerships/budgets/b-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should GET /partnerships/budgets/status with the periodMonth param', () => {
      const status: IBudgetStatus = {
        rows: [{ categoryId: 1, categoryName: 'Hogar', budgeted: 600, spent: 200, remaining: 400 }],
        totalBudgeted: 600,
        totalSpent: 200
      };
      let result: IBudgetStatus | undefined;
      service.getBudgetStatus('2026-06').subscribe(r => (result = r));

      const req = httpMock.expectOne(r => r.url === `${API}/partnerships/budgets/status`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('periodMonth')).toBe('2026-06');
      req.flush(status);

      expect(result).toEqual(status);
    });
  });
});
