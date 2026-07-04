import { Component, Input, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'mg-modal-shell',
    templateUrl: './modal-shell.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule],
    // -m-6 cancels MatDialog's 24px padding; width/height must compensate
    // (+3rem) or the content ends up 48px smaller than the dialog surface
    host: {
        class: '-m-6 flex w-[calc(100%+3rem)] min-h-0 flex-col',
    }
})
export class ModalShellComponent {
  readonly title = input('');
  @Input() subtitle?: string;
  readonly footer = input(true);
  readonly closed = output<void>();
}
