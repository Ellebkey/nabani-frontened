import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HotToastService } from '@ngxpert/hot-toast';
import { of } from 'rxjs';

import { CashFlowCompareComponent } from './cash-flow-compare.component';
import { CashFlowService } from '../services/cash-flow.service';
import { ICategory } from '@shared/interfaces/common.model';

const categories: ICategory[] = [
  {
    id: 2,
    name: 'Comida',
    colorPalette: '#C9A45C',
    subcategories: [
      { id: 10, name: 'Abarrotes' },
      { id: 11, name: 'Restaurant' },
    ],
  } as ICategory,
];

const resultA = {
  total: 9494.1,
  expenseCount: 26,
  average: 365.16,
  bySubcategory: [
    { subcategoryId: 10, subcategoryName: 'Abarrotes', categoryId: 2, categoryName: 'Comida', total: 6842.1 },
    { subcategoryId: 11, subcategoryName: 'Restaurant', categoryId: 2, categoryName: 'Comida', total: 2652 },
  ],
  expenses: [{ id: 1, expenseDate: '2026-05-31', recipientName: 'Costco', total: 2104.6 }],
};
const resultB = {
  total: 11092.05,
  expenseCount: 30,
  average: 369.74,
  bySubcategory: [
    { subcategoryId: 10, subcategoryName: 'Abarrotes', categoryId: 2, categoryName: 'Comida', total: 7915.45 },
    { subcategoryId: 12, subcategoryName: 'Café', categoryId: 2, categoryName: 'Comida', total: 3176.6 },
  ],
  expenses: [{ id: 9, expenseDate: '2026-06-27', recipientName: 'Costco', total: 3241.2 }],
};

describe('CashFlowCompareComponent', () => {
  let fixture: ComponentFixture<CashFlowCompareComponent>;
  let component: CashFlowCompareComponent;
  let api: { getCategoryComparison: jest.Mock };
  let toast: { error: jest.Mock };

  beforeEach(() => {
    api = { getCategoryComparison: jest.fn() };
    toast = { error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [CashFlowCompareComponent],
      providers: [
        { provide: CashFlowService, useValue: api },
        { provide: HotToastService, useValue: toast },
      ],
    }).overrideComponent(CashFlowCompareComponent, {
      set: { template: '', imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });

    fixture = TestBed.createComponent(CashFlowCompareComponent);
    component = fixture.componentInstance;
    component.categories = categories;
  });

  function setupSides(): void {
    component.selectionA = { categoryIds: [2], subcategoryIds: [] };
    component.selectionB = { categoryIds: [2], subcategoryIds: [] };
    component.rangeA.setValue({ start: new Date(2026, 4, 1), end: new Date(2026, 4, 31) });
    component.rangeB.setValue({ start: new Date(2026, 5, 1), end: new Date(2026, 5, 30) });
  }

  it('should not run without a selection on both sides', () => {
    component.selectionA = { categoryIds: [2], subcategoryIds: [] };

    component.runCompare();

    expect(component.canCompare).toBe(false);
    expect(api.getCategoryComparison).not.toHaveBeenCalled();
  });

  it('should query both sides with their categories, subcategories and ranges', () => {
    setupSides();
    component.selectionB = { categoryIds: [], subcategoryIds: [10, 11] };
    api.getCategoryComparison.mockReturnValueOnce(of(resultA)).mockReturnValueOnce(of(resultB));

    component.runCompare();

    expect(api.getCategoryComparison).toHaveBeenNthCalledWith(1, {
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      categoryIds: '2',
      subcategoryIds: undefined,
    });
    expect(api.getCategoryComparison).toHaveBeenNthCalledWith(2, {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      categoryIds: undefined,
      subcategoryIds: '10,11',
    });
    expect(component.resultA()).toEqual(resultA);
    expect(component.resultB()).toEqual(resultB);
  });

  it('should compute the difference against side A', () => {
    setupSides();
    api.getCategoryComparison.mockReturnValueOnce(of(resultA)).mockReturnValueOnce(of(resultB));

    component.runCompare();

    expect(component.diff).toBeCloseTo(1597.95);
    expect(component.diffPercent).toBeCloseTo(16.83, 1);
  });

  it('should pair subcategories from both sides normalized to the global max', () => {
    setupSides();
    api.getCategoryComparison.mockReturnValueOnce(of(resultA)).mockReturnValueOnce(of(resultB));

    component.runCompare();

    expect(component.pairedSubcategories).toEqual([
      { name: 'Abarrotes', a: 6842.1, b: 7915.45 },
      { name: 'Café', a: 0, b: 3176.6 },
      { name: 'Restaurant', a: 2652, b: 0 },
    ]);
    expect(component.pairedMax).toBeCloseTo(7915.45);
  });

  it('should build side labels from category and subcategory names', () => {
    component.selectionA = { categoryIds: [], subcategoryIds: [10, 11] };

    expect(component.sideLabel(component.selectionA)).toBe('Abarrotes + Restaurant');
    expect(component.sideLabel({ categoryIds: [2], subcategoryIds: [] })).toBe('Comida');
    expect(component.sideLabel({ categoryIds: [], subcategoryIds: [] })).toBe('Sin selección');
  });

  it('should label exact months capitalized and custom ranges as day spans', () => {
    setupSides();

    expect(component.periodLabel(component.rangeA)).toBe('Mayo 2026');

    component.rangeB.setValue({ start: new Date(2026, 5, 1), end: new Date(2026, 5, 15) });
    expect(component.periodLabel(component.rangeB)).toBe('1 jun – 15 jun 2026');
    expect(component.shortPeriodLabel(component.rangeA)).toBe('mayo');
  });
});
