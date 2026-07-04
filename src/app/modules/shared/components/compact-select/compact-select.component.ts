import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ElementRef,
  forwardRef,
  signal,
  computed,
  input,
  output,
  viewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';
import { DotComponent } from '../dot/dot.component';

export interface MgSelectOption {
  value: string | number;
  label: string;
  color?: string;
}

@Component({
    selector: 'mg-compact-select',
    templateUrl: './compact-select.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OverlayModule, MatIconModule, DotComponent],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CompactSelectComponent),
            multi: true,
        },
    ]
})
export class CompactSelectComponent implements ControlValueAccessor {
  @Input() set options(value: MgSelectOption[]) {
    this.optionsSignal.set(value ?? []);
  }
  readonly placeholder = input('Elegir');
  readonly size = input<'base' | 'lg' | 'field'>('base');
  readonly valueChange = output<string | number | null>();
  readonly opened = output<boolean>();

  readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly optionsSignal = signal<MgSelectOption[]>([]);
  protected readonly value = signal<string | number | null>(null);
  protected readonly disabled = signal(false);
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(-1);
  protected triggerWidth = 0;

  protected readonly selected = computed(() =>
    this.optionsSignal().find(o => o.value === this.value()) ?? null
  );

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- CVA no-op until registerOnChange
  private onChange: (value: string | number | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- CVA no-op until registerOnTouched
  private onTouched: () => void = () => {};

  writeValue(value: string | number | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  protected openPanel(): void {
    this.triggerWidth = this.trigger().nativeElement.offsetWidth;
    const selectedIndex = this.optionsSignal().findIndex(o => o.value === this.value());
    this.activeIndex.set(selectedIndex >= 0 ? selectedIndex : 0);
    this.open.set(true);
    this.opened.emit(true);
  }

  protected close(): void {
    if (this.open()) {
      this.opened.emit(false);
    }
    this.open.set(false);
    this.onTouched();
  }

  protected select(option: MgSelectOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.close();
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    if (!this.open()) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        this.openPanel();
      }
      return;
    }

    const options = this.optionsSignal();
    const keyHandlers: Record<string, () => void> = {
      ArrowDown: () => this.activeIndex.update(i => Math.min(i + 1, options.length - 1)),
      ArrowUp: () => this.activeIndex.update(i => Math.max(i - 1, 0)),
      Home: () => this.activeIndex.set(0),
      End: () => this.activeIndex.set(options.length - 1),
      Enter: () => {
        const option = options[this.activeIndex()];
        if (option) {
          this.select(option);
        }
      },
      Escape: () => this.close(),
      Tab: () => this.close(),
    };

    const handler = keyHandlers[event.key];
    if (handler) {
      if (event.key !== 'Tab') {
        event.preventDefault();
      }
      handler();
    }
  }
}
