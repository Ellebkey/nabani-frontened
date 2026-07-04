import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PaymentMethodCardGridComponent } from './payment-method-card-grid.component';
import { IPaymentMethod, PAYMENT_METHODS } from '@shared/interfaces/payment-method.model';

const paymentMethod = (overrides: Partial<IPaymentMethod> = {}): IPaymentMethod => ({
  id: 'pm-1',
  shortName: 'Visa Oro',
  method: PAYMENT_METHODS.CREDIT_CARD,
  cardType: 'visa',
  backgroundColor: '#004369',
  cardIcon: null,
  cardNumber: '4521',
  cardCVV: null,
  cardExpiry: null,
  creditLimit: 50000,
  cutOffDay: 15,
  isActive: true,
  accountId: 'acc-1',
  accountName: 'Bancomer',
  ...overrides
});

const daysFromNow = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString();

describe('PaymentMethodCardGridComponent', () => {
  let fixture: ComponentFixture<PaymentMethodCardGridComponent>;
  let component: PaymentMethodCardGridComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaymentMethodCardGridComponent],
      providers: [provideNoopAnimations()]
    });
  });

  const createComponent = (methods: IPaymentMethod[], loading = false): void => {
    fixture = TestBed.createComponent(PaymentMethodCardGridComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('paymentMethods', methods);
    fixture.componentRef.setInput('loading', loading);
    fixture.detectChanges();
  };

  describe('grouping and rendering', () => {
    it('should split methods into "Activos" and "Inactivos" sections', () => {
      const active = paymentMethod();
      const inactive = paymentMethod({ id: 'pm-2', shortName: 'Vieja Débito', method: PAYMENT_METHODS.DEBIT_CARD, isActive: false });
      createComponent([active, inactive]);

      expect(component['activeMethods']()).toEqual([active]);
      expect(component['inactiveMethods']()).toEqual([inactive]);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Pausados');
      expect(text).toContain('Visa Oro');
      expect(text).toContain('Vieja Débito');
    });

    it('should render the card details: type label, masked number, account and credit limit', () => {
      createComponent([paymentMethod()]);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Tarjeta de Crédito');
      expect(text).toContain('•••• 4521');
      expect(text).toContain('Bancomer');
      expect(text).toContain('Corte día 15');
    });

    it('should fall back to "Sin cuenta ligada" when there is no account name and no cutoff', () => {
      createComponent([paymentMethod({ accountName: undefined, cutOffDay: undefined })]);

      expect(fixture.nativeElement.textContent).toContain('Sin cuenta ligada');
    });

    it('should render nothing but skeletons while loading with no data', () => {
      createComponent([], true);

      expect(fixture.nativeElement.querySelectorAll('mg-skeleton').length).toBeGreaterThan(0);
      expect(fixture.nativeElement.textContent).not.toContain('Visa Oro');
    });

    it('should render no sections at all for an empty, non-loading grid', () => {
      createComponent([]);

      expect(fixture.nativeElement.querySelectorAll('mg-ccard').length).toBe(0);
      expect((fixture.nativeElement.textContent ?? '').trim()).toBe('');
    });

    it('should mark expired cards with the Expirada pill', () => {
      createComponent([paymentMethod({ cardExpiry: daysFromNow(-10) })]);

      expect(fixture.nativeElement.textContent).toContain('Expirada');
    });
  });

  describe('output emissions', () => {
    it('should emit edit, delete and toggleStatus through the handler methods', () => {
      const method = paymentMethod();
      createComponent([method]);
      const edited: IPaymentMethod[] = [];
      const deleted: IPaymentMethod[] = [];
      const toggled: IPaymentMethod[] = [];
      component.edit.subscribe(m => edited.push(m));
      component.delete.subscribe(m => deleted.push(m));
      component.toggleStatus.subscribe(m => toggled.push(m));

      component['onEdit'](method);
      component['onDelete'](method);
      component['onToggleStatus'](method);

      expect(edited).toEqual([method]);
      expect(deleted).toEqual([method]);
      expect(toggled).toEqual([method]);
    });

    it('should emit edit when an active card is clicked but not for inactive cards', () => {
      const active = paymentMethod();
      const inactive = paymentMethod({ id: 'pm-2', isActive: false });
      createComponent([active, inactive]);
      const edited: IPaymentMethod[] = [];
      component.edit.subscribe(m => edited.push(m));

      const cards = fixture.nativeElement.querySelectorAll('.rounded-card');
      (cards[0] as HTMLElement).click();
      (cards[1] as HTMLElement).click();

      expect(edited).toEqual([active]);
    });
  });

  describe('getCardColor', () => {
    it('should always use gray for inactive methods', () => {
      createComponent([]);

      expect(component['getCardColor'](paymentMethod({ isActive: false, backgroundColor: '#ed0722' }))).toBe('#6B7280');
    });

    it('should use the backend background color for active methods', () => {
      createComponent([]);

      expect(component['getCardColor'](paymentMethod({ backgroundColor: '#ed0722' }))).toBe('#ed0722');
    });

    it('should fall back to the default primary color when active without color', () => {
      createComponent([]);

      expect(component['getCardColor'](paymentMethod({ backgroundColor: null }))).toBe('#2a4c3c');
    });
  });

  describe('getCardIcon', () => {
    it('should prefer the explicit cardIcon', () => {
      createComponent([]);

      expect(component['getCardIcon'](paymentMethod({ cardIcon: 'heroicons_outline:star' }))).toBe('heroicons_outline:star');
    });

    it.each<[string, string]>([
      [PAYMENT_METHODS.CREDIT_CARD, 'heroicons_outline:credit-card'],
      [PAYMENT_METHODS.DEBIT_CARD, 'heroicons_outline:credit-card'],
      [PAYMENT_METHODS.CASH, 'heroicons_outline:banknotes'],
      [PAYMENT_METHODS.BANK_TRANSFER, 'heroicons_outline:building-library'],
      [PAYMENT_METHODS.DIGITAL_WALLET, 'heroicons_outline:wallet']
    ])('should map the %s method to its icon', (method, icon) => {
      createComponent([]);

      expect(component['getCardIcon'](paymentMethod({ method, cardIcon: null }))).toBe(icon);
    });

    it('should default to the credit card icon for unknown methods', () => {
      createComponent([]);

      expect(component['getCardIcon'](paymentMethod({ method: 'crypto', cardIcon: null }))).toBe('heroicons_outline:credit-card');
    });
  });

  describe('getMaskedCardNumber', () => {
    it('should return an empty string for a missing number', () => {
      createComponent([]);

      expect(component['getMaskedCardNumber'](null)).toBe('');
    });

    it('should mask everything but the last four digits', () => {
      createComponent([]);

      expect(component['getMaskedCardNumber']('4521')).toBe('•••• •••• •••• 4521');
      expect(component['getMaskedCardNumber']('1234567890123456')).toBe('•••• •••• •••• 3456');
    });
  });

  describe('expiry helpers', () => {
    it('should treat null expiry as neither expired nor expiring', () => {
      createComponent([]);

      expect(component['isCardExpired'](null)).toBe(false);
      expect(component['isCardExpiringSoon'](null)).toBe(false);
    });

    it('should flag a past date as expired but not expiring soon', () => {
      createComponent([]);
      const expiry = daysFromNow(-10);

      expect(component['isCardExpired'](expiry)).toBe(true);
      expect(component['isCardExpiringSoon'](expiry)).toBe(false);
    });

    it('should flag a date within three months as expiring soon but not expired', () => {
      createComponent([]);
      const expiry = daysFromNow(30);

      expect(component['isCardExpiringSoon'](expiry)).toBe(true);
      expect(component['isCardExpired'](expiry)).toBe(false);
    });

    it('should flag a far future date as neither', () => {
      createComponent([]);
      const expiry = daysFromNow(200);

      expect(component['isCardExpiringSoon'](expiry)).toBe(false);
      expect(component['isCardExpired'](expiry)).toBe(false);
    });
  });

  describe('display helpers', () => {
    it.each<[string, string]>([
      [PAYMENT_METHODS.CREDIT_CARD, 'Tarjeta de Crédito'],
      [PAYMENT_METHODS.DEBIT_CARD, 'Tarjeta de Débito'],
      [PAYMENT_METHODS.CASH, 'Efectivo'],
      [PAYMENT_METHODS.BANK_TRANSFER, 'Transferencia'],
      [PAYMENT_METHODS.DIGITAL_WALLET, 'Billetera Digital']
    ])('should translate the %s method name to Spanish', (method, label) => {
      createComponent([]);

      expect(component['getMethodDisplayName'](method)).toBe(label);
    });

    it('should pass unknown method names through unchanged', () => {
      createComponent([]);

      expect(component['getMethodDisplayName']('crypto')).toBe('crypto');
    });

    it('should report zero credit utilization', () => {
      createComponent([]);

      expect(component['getCreditUtilization'](paymentMethod())).toBe(0);
    });
  });
});
