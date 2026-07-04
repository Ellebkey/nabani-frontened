import { Component, OnInit, Input, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
    selector: 'app-payment-graphics',
    templateUrl: './payment-graphics.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentGraphicsComponent implements OnInit {
  @Input() background = '';
  @Input() paymentMethod = '';
  @Input() cardType = '';
  @Input() size = 'xs'
  @Input() cardNumber = 'XXXX'
  @Input() cardName = ''
  readonly width = signal(60);
  readonly height = signal(40);
  readonly fontSize = signal(3);

  ngOnInit(): void {
    if (this.size === 'lg') {
      this.width.set(256);
      this.height.set(170.67);
      this.fontSize.set(6);
    }
  }

  isDarkColor(hexColor: string): boolean {
    const color = hexColor.substring(1);  // Remove the leading #
    const rgb = parseInt(color, 16);   // Convert to RGB
    const r = (rgb >> 16) & 0xFF;
    const g = (rgb >> 8) & 0xFF;
    const b = rgb & 0xFF;

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

}
