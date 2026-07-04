import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { es } from 'date-fns/locale';

import { DateRange, DateRangeFilterComponent } from './date-range-filter.component';

describe('DateRangeFilterComponent', () => {
  let fixture: ComponentFixture<DateRangeFilterComponent>;
  let component: DateRangeFilterComponent;
  let emissions: (DateRange | null)[];

  beforeEach(() => {
    // Pin "now" to 2026-08-20 so every preset resolves deterministically.
    // Only Date is faked; real timers keep zone.js/Material happy.
    jest.useFakeTimers({
      now: new Date(2026, 7, 20, 12, 0, 0),
      doNotFake: [
        'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'setImmediate', 'clearImmediate', 'queueMicrotask',
        'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback',
        'nextTick', 'hrtime', 'performance',
      ],
    });

    emissions = [];

    TestBed.configureTestingModule({
      imports: [DateRangeFilterComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DateAdapter, useClass: DateFnsAdapter },
        { provide: MAT_DATE_LOCALE, useValue: es },
        {
          provide: MAT_DATE_FORMATS,
          useValue: {
            parse: { dateInput: 'yyyy-MM-dd' },
            display: {
              dateInput: 'dd MMMM, yyyy',
              monthYearLabel: 'MMMM yyyy',
              dateA11yLabel: 'PP',
              monthYearA11yLabel: 'MMMM yyyy',
            },
          },
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createComponent = (defaultPreset?: string): void => {
    fixture = TestBed.createComponent(DateRangeFilterComponent);
    component = fixture.componentInstance;
    if (defaultPreset !== undefined) {
      component.defaultPreset = defaultPreset;
    }
    component.rangeChange.subscribe((range: DateRange | null) => emissions.push(range));
    fixture.detectChanges();
  };

  describe('initialization', () => {
    it('should emit null once for the default "none" preset and keep the form empty', () => {
      createComponent();

      expect(emissions).toEqual([null]);
      expect(component['activePreset']).toBe('none');
      expect(component['dateForm'].value).toEqual({ startDate: null, endDate: null });
      expect(component['hasDates']).toBe(false);
    });

    it('should apply a defaultPreset input on init and emit its range', () => {
      createComponent('thisMonth');

      expect(emissions).toEqual([{ startDate: '2026-08-01', endDate: '2026-08-31' }]);
      expect(component['activePreset']).toBe('thisMonth');
      expect(component['hasDates']).toBe(true);
    });
  });

  describe('presets', () => {
    it('should expose the six Spanish preset options', () => {
      createComponent();

      expect(component['presets']).toEqual([
        { label: 'Este mes', key: 'thisMonth' },
        { label: '3 meses', key: '3months' },
        { label: '6 meses', key: '6months' },
        { label: 'Este año', key: 'thisYear' },
        { label: '1 año', key: '1year' },
        { label: 'Todo', key: 'all' },
      ]);
    });

    it.each<[string, string, string]>([
      ['thisMonth', '2026-08-01', '2026-08-31'],
      ['3months', '2026-06-01', '2026-08-31'],
      ['6months', '2026-03-01', '2026-08-31'],
      ['thisYear', '2026-01-01', '2026-08-31'],
      ['1year', '2025-09-01', '2026-08-31'],
    ])('should emit the %s range based on the pinned system time', (key, startDate, endDate) => {
      createComponent();
      emissions = [];

      component['applyPreset'](key);

      expect(emissions).toEqual([{ startDate, endDate }]);
      expect(component['activePreset']).toBe(key);
      expect(component['hasDates']).toBe(true);
    });

    it('should clear the dates and emit null for the "all" preset', () => {
      createComponent('thisMonth');
      emissions = [];

      component['applyPreset']('all');

      expect(emissions).toEqual([null]);
      expect(component['activePreset']).toBe('all');
      expect(component['dateForm'].value).toEqual({ startDate: null, endDate: null });
    });

    it('should not emit anything for an unknown preset key', () => {
      createComponent('thisMonth');
      emissions = [];

      component['applyPreset']('bogus');

      expect(emissions).toEqual([]);
      expect(component['activePreset']).toBe('bogus');
      // dates from the previous preset are left untouched
      expect(component['hasDates']).toBe(true);
    });
  });

  describe('manual date selection', () => {
    it('should emit the formatted range and mark the preset as custom when both dates are set', () => {
      createComponent();
      emissions = [];

      component['dateForm'].patchValue({
        startDate: new Date(2026, 0, 5),
        endDate: new Date(2026, 0, 28),
      });
      component['onDateChange']();

      expect(emissions).toEqual([{ startDate: '2026-01-05', endDate: '2026-01-28' }]);
      expect(component['activePreset']).toBe('custom');
    });

    it('should not emit while only the start date is set', () => {
      createComponent();
      emissions = [];

      component['dateForm'].patchValue({ startDate: new Date(2026, 0, 5), endDate: null });
      component['onDateChange']();

      expect(emissions).toEqual([]);
      expect(component['hasDates']).toBe(true);
    });
  });

  describe('clearDates', () => {
    it('should reset the form, the active preset and emit null', () => {
      createComponent('thisMonth');
      emissions = [];

      component['clearDates']();

      expect(emissions).toEqual([null]);
      expect(component['activePreset']).toBe('');
      expect(component['dateForm'].value).toEqual({ startDate: null, endDate: null });
      expect(component['hasDates']).toBe(false);
    });
  });

  describe('template', () => {
    const presetButton = (label: string): HTMLButtonElement | undefined =>
      Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
        .find(button => button.textContent?.trim() === label);

    it('should render a button per preset with its Spanish label', () => {
      createComponent();

      for (const label of ['Este mes', '3 meses', '6 meses', 'Este año', '1 año', 'Todo']) {
        expect(presetButton(label)).toBeTruthy();
      }
    });

    it('should apply the preset and highlight the button on click', () => {
      createComponent();
      emissions = [];

      presetButton('3 meses')!.click();
      fixture.detectChanges();

      expect(emissions).toEqual([{ startDate: '2026-06-01', endDate: '2026-08-31' }]);
      expect(presetButton('3 meses')!.className).toContain('text-white');
      expect(presetButton('Este mes')!.className).not.toContain('text-white');
    });

    it('should show the clear button only when a date is set', () => {
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('mat-icon[data-mat-icon-name="x-mark"]')).toBeNull();

      presetButton('Este mes')!.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mat-icon[data-mat-icon-name="x-mark"]')).toBeTruthy();
    });
  });
});
