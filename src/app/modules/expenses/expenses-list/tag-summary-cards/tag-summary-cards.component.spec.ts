import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TagSummaryCardsComponent } from './tag-summary-cards.component';
import { ITagSummary } from '@shared/interfaces/tag.model';

describe('TagSummaryCardsComponent', () => {
  let fixture: ComponentFixture<TagSummaryCardsComponent>;
  let component: TagSummaryCardsComponent;

  const summaries: ITagSummary[] = [
    { id: 1, name: 'Casa', color: '#ff0000', totalAmount: 1500, expenseCount: 2 },
    { id: 2, name: 'Viaje', color: '#00ff00', totalAmount: 0, expenseCount: 0 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TagSummaryCardsComponent]
    });

    fixture = TestBed.createComponent(TagSummaryCardsComponent);
    component = fixture.componentInstance;
  });

  describe('hasTagsWithExpenses', () => {
    it('should be false for the default empty list', () => {
      expect(component.hasTagsWithExpenses).toBe(false);
    });

    it('should be false when every tag has zero expenses', () => {
      component.tagSummaries = [{ id: 1, name: 'Casa', color: '#f00', totalAmount: 0, expenseCount: 0 }];

      expect(component.hasTagsWithExpenses).toBe(false);
    });

    it('should be true when at least one tag has expenses', () => {
      component.tagSummaries = summaries;

      expect(component.hasTagsWithExpenses).toBe(true);
    });

    it('should be false when the input is nullish', () => {
      component.tagSummaries = undefined as never;

      expect(component.hasTagsWithExpenses).toBe(false);
    });
  });

  it('should emit the tag id on click', () => {
    const emitted: number[] = [];
    component.tagClick.subscribe((id: number) => emitted.push(id));

    component.onTagClick(7);

    expect(emitted).toEqual([7]);
  });

  describe('template', () => {
    it('should render only the tags that have expenses, with the Spanish header', () => {
      fixture.componentRef.setInput('tagSummaries', summaries);

      fixture.detectChanges();

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('Etiquetas');
      expect(text).toContain('Con etiqueta activa');
      expect(text).toContain('Casa');
      expect(text).toContain('2 gastos');
      expect(text).not.toContain('Viaje');
    });

    it('should use the singular "gasto" for a single expense', () => {
      fixture.componentRef.setInput('tagSummaries', [
        { id: 3, name: 'Mascota', color: '#00f', totalAmount: 200, expenseCount: 1 }
      ]);

      fixture.detectChanges();

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('1 gasto');
      expect(text).not.toContain('1 gastos');
    });

    it('should render nothing when no tag has expenses', () => {
      fixture.componentRef.setInput('tagSummaries', [summaries[1]]);

      fixture.detectChanges();

      expect((fixture.nativeElement.textContent as string).trim()).toBe('');
    });

    it('should emit the clicked tag id from the card', () => {
      const emitted: number[] = [];
      component.tagClick.subscribe((id: number) => emitted.push(id));
      fixture.componentRef.setInput('tagSummaries', summaries);
      fixture.detectChanges();

      const card: HTMLElement = fixture.nativeElement.querySelector('button');
      card.click();

      expect(emitted).toEqual([1]);
    });
  });

  it('formats the tag period from first to last expense date, collapsing same-month', () => {
    expect(component.periodLabel({
      id: 1, name: 'Japón', color: '#4E8A6A', totalAmount: 1, expenseCount: 1,
      firstExpenseDate: '2024-11-05', lastExpenseDate: '2026-06-20',
    })).toMatch(/nov.*2024.*jun.*2026/i);

    expect(component.periodLabel({
      id: 1, name: 'Japón', color: '#4E8A6A', totalAmount: 1, expenseCount: 1,
      firstExpenseDate: '2026-06-01', lastExpenseDate: '2026-06-20',
    })).toMatch(/^jun.*2026$/i);

    expect(component.periodLabel({
      id: 1, name: 'Japón', color: '#4E8A6A', totalAmount: 1, expenseCount: 1,
    })).toBeNull();
  });

});
