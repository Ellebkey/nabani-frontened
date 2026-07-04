import { Component, OnInit, Input, ChangeDetectionStrategy, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from 'date-fns';

export interface DateRange {
  startDate: string;
  endDate: string;
}

@Component({
    selector: 'app-date-range-filter',
    templateUrl: './date-range-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
    ],
    // 'contents' deja que campo y chips se coloquen como items separados del grid
    // de filtros del padre (campo en su columna, chips ocupando la fila completa)
    host: { class: 'contents' }
})
export class DateRangeFilterComponent implements OnInit {
  @Input() defaultPreset = 'none';
  readonly rangeChange = output<DateRange | null>();

  protected activePreset = '';

  protected readonly presets: { label: string; key: string }[] = [
    { label: 'Este mes', key: 'thisMonth' },
    { label: '3 meses', key: '3months' },
    { label: '6 meses', key: '6months' },
    { label: 'Este año', key: 'thisYear' },
    { label: '1 año', key: '1year' },
    { label: 'Todo', key: 'all' },
  ];

  protected dateForm = new FormGroup({
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
  });

  protected get hasDates(): boolean {
    return !!(this.dateForm.get('startDate')?.value || this.dateForm.get('endDate')?.value);
  }

  ngOnInit(): void {
    this.applyPreset(this.defaultPreset);
  }

  protected onDateChange(): void {
    const start = this.dateForm.get('startDate')?.value;
    const end = this.dateForm.get('endDate')?.value;
    if (start && end) {
      this.activePreset = 'custom';
      this.rangeChange.emit({
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      });
    }
  }

  protected clearDates(): void {
    this.activePreset = '';
    this.dateForm.patchValue({ startDate: null, endDate: null });
    this.rangeChange.emit(null);
  }

  protected applyPreset(key: string): void {
    this.activePreset = key;

    if (key === 'all' || key === 'none') {
      this.dateForm.patchValue({ startDate: null, endDate: null });
      this.rangeChange.emit(null);
      return;
    }

    const now = new Date();
    const end = endOfMonth(now);
    const presetMap: Record<string, Date> = {
      thisMonth: startOfMonth(now),
      '3months': startOfMonth(subMonths(now, 2)),
      '6months': startOfMonth(subMonths(now, 5)),
      thisYear: startOfYear(now),
      '1year': startOfMonth(subMonths(now, 11)),
    };

    const start = presetMap[key];
    if (!start) return;

    this.dateForm.patchValue({ startDate: start, endDate: end });
    this.rangeChange.emit({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    });
  }
}
