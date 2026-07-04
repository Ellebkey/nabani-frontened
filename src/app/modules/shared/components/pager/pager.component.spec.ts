import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';

import { PagerComponent, PageEvent } from './pager.component';

describe('PagerComponent', () => {
  let fixture: ComponentFixture<PagerComponent>;
  let component: PagerComponent;
  let emissions: PageEvent[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PagerComponent, MatIconTestingModule],
    });

    fixture = TestBed.createComponent(PagerComponent);
    component = fixture.componentInstance;
    emissions = [];
    component.pageChange.subscribe(e => emissions.push(e));
  });

  const setInputs = (limit: number, offset: number, count: number): void => {
    fixture.componentRef.setInput('limit', limit);
    fixture.componentRef.setInput('offset', offset);
    fixture.componentRef.setInput('count', count);
    fixture.detectChanges();
  };

  const numberButtons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button.mg-pager-btn')).filter(
      (b): b is HTMLButtonElement => /^\d+$/.test((b as HTMLButtonElement).textContent!.trim())
    );

  it('muestra la ventana de 5 páginas desde la primera', () => {
    setInputs(25, 0, 9813);

    expect(numberButtons().map(b => b.textContent!.trim())).toEqual(['1', '2', '3', '4', '5']);
    expect(numberButtons()[0].classList).toContain('on');
  });

  it('centra la ventana en la página actual', () => {
    setInputs(25, 199 * 25, 9813);

    expect(numberButtons().map(b => b.textContent!.trim())).toEqual(['198', '199', '200', '201', '202']);
  });

  it('ancla la ventana al final en las últimas páginas', () => {
    setInputs(25, 392 * 25, 9813);

    expect(numberButtons().map(b => b.textContent!.trim())).toEqual(['389', '390', '391', '392', '393']);
  });

  it('muestra el rango visible y el total', () => {
    setInputs(25, 50, 9813);

    expect(fixture.nativeElement.textContent).toContain('51–75');
    expect(fixture.nativeElement.textContent).toContain('de 9,813');
  });

  it('emite el offset de la página elegida', () => {
    setInputs(25, 0, 9813);

    numberButtons()[2].click();

    expect(emissions).toEqual([{ limit: 25, offset: 50 }]);
  });

  it('no emite al hacer clic en la página actual', () => {
    setInputs(25, 0, 9813);

    numberButtons()[0].click();

    expect(emissions).toEqual([]);
  });

  it('deshabilita primera/anterior en la primera página y última/siguiente en la última', () => {
    setInputs(25, 0, 100);
    let buttons = fixture.nativeElement.querySelectorAll('button.mg-pager-btn');

    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);

    setInputs(25, 75, 100);
    buttons = fixture.nativeElement.querySelectorAll('button.mg-pager-btn');
    expect(buttons[buttons.length - 2].disabled).toBe(true);
    expect(buttons[buttons.length - 1].disabled).toBe(true);
  });

  it('maneja count 0 sin romper el rango', () => {
    setInputs(25, 0, 0);

    expect(fixture.nativeElement.textContent).toContain('0–0');
    expect(numberButtons().map(b => b.textContent!.trim())).toEqual(['1']);
  });

  it('offers page sizes (including a custom current limit) and resets the offset on change', () => {
    fixture.componentRef.setInput('limit', 30);
    fixture.componentRef.setInput('offset', 60);
    fixture.componentRef.setInput('count', 200);
    fixture.detectChanges();

    expect((component as any).sizeOptions.map((o: any) => o.value)).toEqual([10, 25, 30, 50, 100]);

    const emitted: unknown[] = [];
    component.pageChange.subscribe(event => emitted.push(event));

    (component as any).onLimitChange(30); // same limit → no-op
    expect(emitted).toHaveLength(0);

    (component as any).onLimitChange(50);
    expect(emitted.pop()).toEqual({ limit: 50, offset: 0 });
  });

});
