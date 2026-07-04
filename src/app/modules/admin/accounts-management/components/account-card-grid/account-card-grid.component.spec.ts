import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AccountCardGridComponent } from './account-card-grid.component';
import { IAccount } from '@shared/interfaces/account.model';

const account = (overrides: Partial<IAccount> = {}): IAccount => ({
  id: 'a-1',
  name: 'Bancomer',
  currentAmount: 1500,
  value: 0,
  showSection: false,
  colorPalette: '#3570B4',
  isPrimary: false,
  disable: false,
  ownerId: 'u-1',
  ...overrides
});

const activeAccount = account();
const inactiveAccount = account({ id: 'a-2', name: 'Vieja Cuenta', currentAmount: -200, colorPalette: '#ed0722', disable: true });

describe('AccountCardGridComponent', () => {
  let fixture: ComponentFixture<AccountCardGridComponent>;
  let component: AccountCardGridComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccountCardGridComponent],
      providers: [provideNoopAnimations()]
    });
  });

  const createComponent = (accounts: IAccount[]): void => {
    fixture = TestBed.createComponent(AccountCardGridComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('accounts', accounts);
    fixture.detectChanges();
  };

  const openMenu = (triggerIndex: number): HTMLElement[] => {
    const triggers = fixture.nativeElement.querySelectorAll('[aria-haspopup="menu"]');
    (triggers[triggerIndex] as HTMLElement).click();
    fixture.detectChanges();
    return Array.from(document.querySelectorAll('button.mat-mdc-menu-item'));
  };

  const menuItem = (items: HTMLElement[], label: string): HTMLElement | undefined =>
    items.find(item => (item.textContent ?? '').includes(label));

  describe('grouping', () => {
    it('should split accounts into active and inactive sections', () => {
      createComponent([activeAccount, inactiveAccount]);

      expect(component['activeAccounts']()).toEqual([activeAccount]);
      expect(component['inactiveAccounts']()).toEqual([inactiveAccount]);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Pausadas');
      expect(text).toContain('Bancomer');
      expect(text).toContain('Vieja Cuenta');
      expect(text).toContain('Saldo actual');
      expect(text).toContain('1,500');
    });

    it('should not render the inactive section when every account is active', () => {
      createComponent([activeAccount]);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Bancomer');
      expect(text).not.toContain('Pausadas');
    });

    it('should show the Spanish empty state when there are no accounts', () => {
      createComponent([]);

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No hay cuentas para mostrar');
      expect(text).toContain('Los resultados aparecerán aquí cuando agregues cuentas');
      expect(text).not.toContain('Saldo actual');
    });
  });

  describe('getCardColor', () => {
    it('should use the account palette for active accounts and gray for disabled ones', () => {
      createComponent([activeAccount, inactiveAccount]);

      expect(component['getCardColor'](activeAccount)).toBe('#3570B4');
      expect(component['getCardColor'](inactiveAccount)).toBe('#6B7280');
    });
  });

  describe('card click', () => {
    it('should emit editAccount when an active card is clicked', () => {
      createComponent([activeAccount, inactiveAccount]);
      const emitted: IAccount[] = [];
      component.editAccount.subscribe(a => emitted.push(a));

      const cards = fixture.nativeElement.querySelectorAll('.bg-card');
      (cards[0] as HTMLElement).click();

      expect(emitted).toEqual([activeAccount]);
    });

    it('should not emit editAccount when a disabled card is clicked', () => {
      createComponent([activeAccount, inactiveAccount]);
      const emitted: IAccount[] = [];
      component.editAccount.subscribe(a => emitted.push(a));

      const cards = fixture.nativeElement.querySelectorAll('.bg-card');
      (cards[1] as HTMLElement).click();

      expect(emitted).toEqual([]);
    });
  });

  describe('card menu', () => {
    it('should open the active card menu without triggering the card edit click', () => {
      createComponent([activeAccount, inactiveAccount]);
      const emitted: IAccount[] = [];
      component.editAccount.subscribe(a => emitted.push(a));

      const items = openMenu(0);

      expect(emitted).toEqual([]);
      expect(menuItem(items, 'Editar')).toBeDefined();
      expect(menuItem(items, 'Pausar')).toBeDefined();
    });

    it('should emit editAccount from the active card menu', () => {
      createComponent([activeAccount]);
      const emitted: IAccount[] = [];
      component.editAccount.subscribe(a => emitted.push(a));

      const items = openMenu(0);
      menuItem(items, 'Editar')!.click();

      expect(emitted).toEqual([activeAccount]);
    });

    it('should emit toggleStatus with "Pausar" for an active account', () => {
      createComponent([activeAccount]);
      const emitted: IAccount[] = [];
      component.toggleStatus.subscribe(a => emitted.push(a));

      const items = openMenu(0);
      menuItem(items, 'Pausar')!.click();

      expect(emitted).toEqual([activeAccount]);
    });

    it('should offer "Activar" but no edit option for a disabled account', () => {
      createComponent([inactiveAccount]);
      const emitted: IAccount[] = [];
      component.toggleStatus.subscribe(a => emitted.push(a));

      const items = openMenu(0);

      expect(menuItem(items, 'Editar')).toBeUndefined();
      menuItem(items, 'Activar')!.click();

      expect(emitted).toEqual([inactiveAccount]);
    });
  });
});
