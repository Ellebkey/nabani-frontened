import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SankeyChartComponent } from './sankey-chart.component';
import { SankeyData, NodeClickEvent } from '../../interfaces/cash-flow.model';

const sankeyFixture: SankeyData = {
  nodes: [
    { id: 'total-expenses', label: 'Total Gastos', value: 900, color: '#aa6d4b' },
    { id: 'category-Comida', label: 'Comida', value: 600, color: '#C9A45C', categoryId: 2 },
    { id: 'category-Transporte', label: 'Transporte', value: 300, color: '#5F7386', categoryId: 3 },
  ],
  links: [
    { source: 'total-expenses', target: 'category-Comida', value: 600 },
    { source: 'total-expenses', target: 'category-Transporte', value: 300 },
  ],
  totalIncome: 0,
  totalExpenses: 900,
  netCashFlow: -900,
};

describe('SankeyChartComponent', () => {
  let fixture: ComponentFixture<SankeyChartComponent>;
  let component: SankeyChartComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SankeyChartComponent] });
    fixture = TestBed.createComponent(SankeyChartComponent);
    component = fixture.componentInstance;
  });

  function render(data: SankeyData = sankeyFixture, primaryColor: string | null = null): void {
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('primaryColor', primaryColor);
    fixture.detectChanges();
  }

  function svg(): SVGSVGElement | null {
    return fixture.nativeElement.querySelector('svg');
  }

  describe('rendering', () => {
    it('should draw one rect per node with its own color, 14px wide and rx 4', () => {
      render();

      const rects = Array.from(svg()!.querySelectorAll('rect')) as SVGRectElement[];
      expect(rects).toHaveLength(3);
      expect(rects.map(rect => rect.getAttribute('fill'))).toEqual(
        expect.arrayContaining(['#2A4C3C', '#C9A45C', '#5F7386']),
      );
      rects.forEach(rect => {
        expect(rect.getAttribute('width')).toBe('14');
        expect(rect.getAttribute('rx')).toBe('4');
      });
    });

    it('should color the source node with the primaryColor when given (tag mode)', () => {
      render(sankeyFixture, '#4E8A6A');

      const fills = Array.from(svg()!.querySelectorAll('rect')).map(rect => rect.getAttribute('fill'));
      expect(fills).toContain('#4E8A6A');
      expect(fills).not.toContain('#2A4C3C');
    });

    it('should paint the ribbons with the target category color at 32% opacity', () => {
      render();

      const links = Array.from(svg()!.querySelectorAll('path')) as SVGPathElement[];
      expect(links).toHaveLength(2);
      expect(links.map(link => link.getAttribute('stroke')).sort()).toEqual(['#5F7386', '#C9A45C']);
      links.forEach(link => expect(link.getAttribute('stroke-opacity')).toBe('0.32'));
    });

    it('should label nodes with name and tabular amount', () => {
      render();

      const text = svg()!.textContent || '';
      expect(text).toContain('Total Gastos');
      expect(text).toContain('Comida');
      expect(text).toContain('$600.00');
      expect(text).toContain('$900.00');
    });
  });

  describe('interaction', () => {
    it('should emit the category with its rendered color when a node is clicked', () => {
      render();
      const events: NodeClickEvent[] = [];
      component.nodeClick.subscribe(event => events.push(event));

      const groups = Array.from(svg()!.querySelectorAll('g > g > g')) as SVGGElement[];
      const comidaGroup = groups.find(group => group.textContent?.includes('Comida'));
      comidaGroup!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(expect.objectContaining({
        label: 'Comida',
        value: 600,
        type: 'category',
        color: '#C9A45C',
      }));
    });

    it('should NOT emit when the source node is clicked', () => {
      render();
      const events: NodeClickEvent[] = [];
      component.nodeClick.subscribe(event => events.push(event));

      const groups = Array.from(svg()!.querySelectorAll('g > g > g')) as SVGGElement[];
      const sourceGroup = groups.find(group => group.textContent?.includes('Total Gastos'));
      sourceGroup!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(events).toHaveLength(0);
    });
  });
});
