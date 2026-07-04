import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CompareSelectComponent } from './compare-select.component';
import { CompareSelection } from '../../interfaces/cash-flow.model';
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
  { id: 3, name: 'Transporte', colorPalette: null, subcategories: [] } as unknown as ICategory,
];

describe('CompareSelectComponent', () => {
  let fixture: ComponentFixture<CompareSelectComponent>;
  let component: CompareSelectComponent;
  let emitted: CompareSelection[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CompareSelectComponent, NoopAnimationsModule] });
    fixture = TestBed.createComponent(CompareSelectComponent);
    component = fixture.componentInstance;
    component.categories = categories;
    emitted = [];
    component.selectionChange.subscribe(selection => emitted.push(selection));
    fixture.detectChanges();
  });

  function set(selection: CompareSelection): void {
    component.selection = selection;
  }

  it('renders category pills with the category muted color and subcategory pills with the parent color', () => {
    set({ categoryIds: [2], subcategoryIds: [] });
    expect(component['pills']).toEqual([
      { label: 'Comida', color: '#C9A45C', kind: 'category', id: 2 },
    ]);

    set({ categoryIds: [], subcategoryIds: [11] });
    expect(component['pills']).toEqual([
      { label: 'Restaurant', color: '#C9A45C', kind: 'subcategory', id: 11 },
    ]);
  });

  it('selecting a whole category absorbs its individually-picked subcategories', () => {
    set({ categoryIds: [], subcategoryIds: [10, 11] });

    component['toggleCategory'](categories[0]);

    expect(emitted.pop()).toEqual({ categoryIds: [2], subcategoryIds: [] });
  });

  it('deselecting a category keeps unrelated subcategories', () => {
    set({ categoryIds: [2], subcategoryIds: [] });

    component['toggleCategory'](categories[0]);

    expect(emitted.pop()).toEqual({ categoryIds: [], subcategoryIds: [] });
  });

  it('toggles subcategories unless the parent category is selected', () => {
    set({ categoryIds: [], subcategoryIds: [] });
    component['toggleSubcategory'](categories[0], categories[0].subcategories[0]);
    expect(emitted.pop()).toEqual({ categoryIds: [], subcategoryIds: [10] });

    set({ categoryIds: [], subcategoryIds: [10] });
    component['toggleSubcategory'](categories[0], categories[0].subcategories[0]);
    expect(emitted.pop()).toEqual({ categoryIds: [], subcategoryIds: [] });

    set({ categoryIds: [2], subcategoryIds: [] });
    const before = emitted.length;
    component['toggleSubcategory'](categories[0], categories[0].subcategories[0]);
    expect(emitted.length).toBe(before);
  });

  it('removes pills of both kinds', () => {
    set({ categoryIds: [2], subcategoryIds: [11] });
    const event = { stopPropagation: jest.fn() } as unknown as Event;

    component['removePill']({ label: 'Comida', color: '', kind: 'category', id: 2 }, event);
    expect(emitted.pop()).toEqual({ categoryIds: [], subcategoryIds: [11] });

    component['removePill']({ label: 'Restaurant', color: '', kind: 'subcategory', id: 11 }, event);
    expect(emitted.pop()).toEqual({ categoryIds: [2], subcategoryIds: [] });
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
  });

  it('maps invalid colors to the muted fallback and toggles the panel', () => {
    expect(component['mutedColor'](null)).toBe('#5F7386');
    expect(component['isCategorySelected'](categories[1])).toBe(false);

    component['toggle']();
    expect(component['open']()).toBe(true);
    component['close']();
    expect(component['open']()).toBe(false);
  });
});
