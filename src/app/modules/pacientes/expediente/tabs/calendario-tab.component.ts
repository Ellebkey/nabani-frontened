import { Component, ChangeDetectionStrategy, computed, effect, signal, input, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  isSameMonth, isToday, isSameDay, format, parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { forkJoin } from 'rxjs';

import { PacientesService } from '../../pacientes.service';
import { ICalendarDay } from '../../pacientes.models';

interface DayMeta {
  hasMenu: boolean;
  adeudo: boolean;
  isLastDay: boolean;
}

interface CalendarCell {
  date: Date;
  day: number;
  inMonth: boolean;
  today: boolean;
  meta: DayMeta;
}

@Component({
  selector: 'app-calendario-tab',
  templateUrl: './calendario-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class CalendarioTabComponent {
  private pacientesService = inject(PacientesService);

  readonly patientId = input.required<number>();
  readonly reloadTick = input(0);

  readonly dayMap = signal<Map<string, DayMeta>>(new Map());
  readonly monthCursor = signal<Date>(startOfMonth(new Date()));
  readonly isLoaded = signal(false);
  private initialized = false;

  protected readonly weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  readonly monthTitle = computed(() => {
    const label = format(this.monthCursor(), 'LLLL yyyy', { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly cells = computed<CalendarCell[]>(() => {
    const cursor = this.monthCursor();
    const map = this.dayMap();
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const cells: CalendarCell[] = [];
    let day = gridStart;
    while (day <= gridEnd) {
      const key = format(day, 'yyyy-MM-dd');
      cells.push({
        date: day,
        day: day.getDate(),
        inMonth: isSameMonth(day, cursor),
        today: isToday(day),
        meta: map.get(key) ?? { hasMenu: false, adeudo: false, isLastDay: false },
      });
      day = addDays(day, 1);
    }
    return cells;
  });

  constructor() {
    effect(() => {
      const id = this.patientId();
      this.reloadTick();
      if (id) this.load(id);
    });
  }

  private load(id: number): void {
    this.isLoaded.set(false);
    forkJoin({
      days: this.pacientesService.getCalendarDays(id),
      payments: this.pacientesService.getPayments(id),
    }).subscribe({
      next: ({ days, payments }) => {
        const dayList: ICalendarDay[] = Array.isArray(days) ? days : [];
        const unpaid = new Set(
          (payments.rows ?? []).filter(p => !p.paid).map(p => p.id)
        );
        const validDates = dayList
          .map(d => this.toDate(d.deliveryDate))
          .filter((d): d is Date => d !== null);
        const lastDate = validDates.length
          ? validDates.reduce((a, b) => (a > b ? a : b))
          : null;

        const map = new Map<string, DayMeta>();
        for (const d of dayList) {
          const date = this.toDate(d.deliveryDate);
          if (!date) continue;
          const key = format(date, 'yyyy-MM-dd');
          map.set(key, {
            hasMenu: !!d.hasMenu,
            adeudo: d.paymentId != null && unpaid.has(d.paymentId),
            isLastDay: lastDate != null && isSameDay(date, lastDate),
          });
        }
        this.dayMap.set(map);
        if (!this.initialized && validDates.length) {
          const earliest = validDates.reduce((a, b) => (a < b ? a : b));
          this.monthCursor.set(startOfMonth(earliest));
        }
        this.initialized = true;
        this.isLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.dayMap.set(new Map());
        this.isLoaded.set(true);
      },
    });
  }

  prevMonth(): void {
    this.monthCursor.update(d => addMonths(d, -1));
  }

  nextMonth(): void {
    this.monthCursor.update(d => addMonths(d, 1));
  }

  goToday(): void {
    this.monthCursor.set(startOfMonth(new Date()));
  }

  private toDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    try {
      const d = parseISO(dateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
}
