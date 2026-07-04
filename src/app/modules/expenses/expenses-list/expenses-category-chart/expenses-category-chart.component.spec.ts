import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { ExpensesCategoryChartComponent } from './expenses-category-chart.component';
import { CHART_CATEGORY_COLORS } from '@shared/services/chart.service';

type ChartInput = ExpensesCategoryChartComponent['expensesByCategory'];

describe('ExpensesCategoryChartComponent', () => {
  let fixture: ComponentFixture<ExpensesCategoryChartComponent>;
  let component: ExpensesCategoryChartComponent;

  const chartInput: ChartInput = {
    series: [
      {
        data: [
          { x: 'Hogar', y: 600, colorPalette: '#123456' },
          { x: 'Súper', y: 100, extraLabel: 300, colorPalette: null },
          { x: 'Luz', y: 100 }
        ]
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [CommonModule, ExpensesCategoryChartComponent],
    schemas: [NO_ERRORS_SCHEMA]
});

    fixture = TestBed.createComponent(ExpensesCategoryChartComponent);
    component = fixture.componentInstance;
  });

  describe('buildCategories on init', () => {
    it('should leave the categories empty without input data', () => {
      component.ngOnInit();

      expect(component.categories()).toEqual([]);
    });

    it('should build bars, shares and colors, preferring extraLabel over y', () => {
      component.expensesByCategory = chartInput;

      component.ngOnInit();

      expect(component.categories()).toEqual([
        {
          name: 'Hogar',
          amount: 600,
          barWidth: 100,
          sharePercent: 60,
          color: '#123456'
        },
        {
          name: 'Súper',
          amount: 300,
          barWidth: 50,
          sharePercent: 30,
          color: CHART_CATEGORY_COLORS[1]
        },
        {
          name: 'Luz',
          amount: 100,
          barWidth: (100 / 600) * 100,
          sharePercent: 10,
          color: CHART_CATEGORY_COLORS[2]
        }
      ]);
    });

    it('should produce zero bar widths and shares when every amount is zero', () => {
      component.expensesByCategory = { series: [{ data: [{ x: 'Hogar', y: 0 }] }] };

      component.ngOnInit();

      expect(component.categories()).toEqual([
        { name: 'Hogar', amount: 0, barWidth: 0, sharePercent: 0, color: CHART_CATEGORY_COLORS[0] }
      ]);
    });

    it('should map an empty data array to no categories', () => {
      component.expensesByCategory = { series: [{ data: [] }] };

      component.ngOnInit();

      expect(component.categories()).toEqual([]);
    });
  });

  describe('ngOnChanges', () => {
    it('should ignore the first change (ngOnInit already builds)', () => {
      component.expensesByCategory = chartInput;
      component.ngOnInit();
      const built = component.categories();

      component.ngOnChanges({
        expensesByCategory: new SimpleChange(undefined, chartInput, true)
      });

      expect(component.categories()).toBe(built);
    });

    it('should rebuild when the chart input changes after the first time', () => {
      component.expensesByCategory = chartInput;
      component.ngOnInit();
      const next: ChartInput = { series: [{ data: [{ x: 'Gas', y: 50 }] }] };
      component.expensesByCategory = next;

      component.ngOnChanges({
        expensesByCategory: new SimpleChange(chartInput, next, false)
      });

      expect(component.categories()).toEqual([
        { name: 'Gas', amount: 50, barWidth: 100, sharePercent: 100, color: CHART_CATEGORY_COLORS[0] }
      ]);
    });

    it('should not rebuild for unrelated input changes', () => {
      component.expensesByCategory = chartInput;
      component.ngOnInit();
      const built = component.categories();

      component.ngOnChanges({ dateLabel: new SimpleChange('a', 'b', false) });

      expect(component.categories()).toBe(built);
    });
  });

  describe('formatCurrency', () => {
    it('should format with a dollar sign, thousands separators and two decimals', () => {
      expect(component.formatCurrency(1234.5)).toBe('$1,234.50');
      expect(component.formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('template', () => {
    it('should render the header, date label and every category row', () => {
      component.expensesByCategory = chartInput;
      component.dateLabel = 'Últimos 30 días';

      fixture.detectChanges();

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('Distribución');
      expect(text).toContain('Últimos 30 días');
      expect(text).toContain('Hogar');
      expect(text).toContain('$600.00');
      expect(text).toContain('Súper');
      expect(text).toContain('$300.00');
    });
  });
});
