import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { PaymentGraphicsComponent } from './payment-graphics.component';

describe('PaymentGraphicsComponent', () => {
  let fixture: ComponentFixture<PaymentGraphicsComponent>;
  let component: PaymentGraphicsComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [CommonModule, PaymentGraphicsComponent],
    schemas: [NO_ERRORS_SCHEMA]
});

    fixture = TestBed.createComponent(PaymentGraphicsComponent);
    component = fixture.componentInstance;
  });

  describe('sizing', () => {
    it('should keep the small dimensions for the default size', () => {
      component.ngOnInit();

      expect(component.width()).toBe(60);
      expect(component.height()).toBe(40);
      expect(component.fontSize()).toBe(3);
    });

    it('should scale up for the lg size', () => {
      component.size = 'lg';

      component.ngOnInit();

      expect(component.width()).toBe(256);
      expect(component.height()).toBe(170.67);
      expect(component.fontSize()).toBe(6);
    });

    it('should keep the small dimensions for any other size value', () => {
      component.size = 'md';

      component.ngOnInit();

      expect(component.width()).toBe(60);
      expect(component.height()).toBe(40);
    });
  });

  describe('isDarkColor', () => {
    it.each<[string, boolean]>([
      ['#000000', true],
      ['#FFFFFF', false],
      ['#193076', true],
      ['#F5B600', false]
    ])('should classify %s as dark=%s', (color, dark) => {
      expect(component.isDarkColor(color)).toBe(dark);
    });
  });

  describe('template', () => {
    it('should render a card svg with number, name and white VISA logo on a dark card', () => {
      component.paymentMethod = 'credit';
      component.cardType = 'visa';
      component.background = '#193076';
      component.cardNumber = '1234';
      component.cardName = 'JOEL';

      fixture.detectChanges();

      const svg: SVGElement = fixture.nativeElement.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg.getAttribute('width')).toBe('60');
      expect(svg.getAttribute('height')).toBe('40');
      expect(fixture.nativeElement.querySelector('rect').getAttribute('fill')).toBe('#193076');

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('1234');
      expect(text).toContain('JOEL');
      expect(text).toContain('VISA');

      const visaText = Array.from<Element>(fixture.nativeElement.querySelectorAll('text'))
        .find((node: Element) => node.textContent === 'VISA') as Element;
      expect(visaText.getAttribute('fill')).toBe('#FFFFFF');
    });

    it('should use the blue VISA logo on a light card and hide the empty card name', () => {
      component.paymentMethod = 'debit';
      component.cardType = 'visa';
      component.background = '#F5B600';
      component.cardName = '';

      fixture.detectChanges();

      const texts = Array.from(fixture.nativeElement.querySelectorAll('text')) as Element[];
      expect(texts.map(node => node.textContent)).toEqual(['XXXX', 'VISA']);
      expect(texts[1].getAttribute('fill')).toBe('#193076');
    });

    it('should render the two mastercard circles', () => {
      component.paymentMethod = 'credit';
      component.cardType = 'mastercard';
      component.background = '#000000';

      fixture.detectChanges();

      const circles = fixture.nativeElement.querySelectorAll('circle');
      expect(circles).toHaveLength(2);
      expect(circles[0].getAttribute('fill')).toBe('#FF5F00');
      expect(circles[1].getAttribute('fill')).toBe('#F5B600');
    });

    it('should render the cash image for cash payments', () => {
      component.paymentMethod = 'cash';

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('svg')).toBeNull();
      expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('assets/images/cash.png');
    });

    it('should render the transfer image for transfers', () => {
      component.paymentMethod = 'transfer';

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('assets/images/transfer.png');
    });

    it('should render nothing for an unknown payment method', () => {
      component.paymentMethod = 'wallet';

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('svg')).toBeNull();
      expect(fixture.nativeElement.querySelector('img')).toBeNull();
    });
  });
});
