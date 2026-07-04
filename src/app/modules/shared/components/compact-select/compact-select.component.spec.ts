import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';

import { CompactSelectComponent, MgSelectOption } from './compact-select.component';

const OPTIONS: MgSelectOption[] = [
  { value: 1, label: 'BBVA Débito', color: '#3B5F82' },
  { value: 2, label: 'Efectivo', color: '#4E8A6A' },
  { value: 3, label: 'Vales de Despensa', color: '#C08A4E' },
];

describe('CompactSelectComponent', () => {
  let fixture: ComponentFixture<CompactSelectComponent>;
  let component: CompactSelectComponent;
  let overlayContainer: OverlayContainer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CompactSelectComponent, MatIconTestingModule],
      providers: [provideNoopAnimations()],
    });

    fixture = TestBed.createComponent(CompactSelectComponent);
    component = fixture.componentInstance;
    component.options = OPTIONS;
    overlayContainer = TestBed.inject(OverlayContainer);
    fixture.detectChanges();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button');

  const panelOptions = (): HTMLButtonElement[] =>
    Array.from(overlayContainer.getContainerElement().querySelectorAll('[role="option"]'));

  it('muestra el placeholder sin valor seleccionado', () => {
    expect(trigger().textContent).toContain('Elegir');
  });

  it('muestra la opción activa cuando el form escribe el valor', () => {
    component.writeValue(2);
    fixture.detectChanges();

    expect(trigger().textContent).toContain('Efectivo');
  });

  it('abre el panel y lista las opciones', () => {
    trigger().click();
    fixture.detectChanges();

    expect(panelOptions().map(o => o.textContent!.trim())).toEqual([
      'BBVA Débito',
      'Efectivo',
      'Vales de Despensa',
    ]);
  });

  it('selecciona con clic, propaga al form y cierra', () => {
    const changes: (string | number | null)[] = [];
    component.registerOnChange(v => changes.push(v));

    trigger().click();
    fixture.detectChanges();
    panelOptions()[1].click();
    fixture.detectChanges();

    expect(changes).toEqual([2]);
    expect(trigger().textContent).toContain('Efectivo');
    expect(panelOptions()).toEqual([]);
  });

  it('navega con teclado y selecciona con Enter', () => {
    const changes: (string | number | null)[] = [];
    component.registerOnChange(v => changes.push(v));

    const press = (key: string): void => {
      trigger().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };

    press('ArrowDown');
    expect(panelOptions().length).toBe(3);

    press('ArrowDown');
    press('Enter');

    expect(changes).toEqual([2]);
    expect(panelOptions()).toEqual([]);
  });

  it('cierra con Escape sin cambiar el valor', () => {
    component.writeValue(1);
    trigger().click();
    fixture.detectChanges();

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(panelOptions()).toEqual([]);
    expect(trigger().textContent).toContain('BBVA Débito');
  });

  it('no abre cuando el control está deshabilitado', () => {
    component.setDisabledState(true);
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();

    expect(panelOptions()).toEqual([]);
  });

  describe('ControlValueAccessor + keyboard', () => {
    it('implements the CVA contract: writeValue, change/touched callbacks, disabled state', () => {
      const onChange = jest.fn();
      const onTouched = jest.fn();
      component.registerOnChange(onChange);
      component.registerOnTouched(onTouched);

      component.writeValue('a-2');
      expect(component['value']()).toBe('a-2');

      component['select']({ value: 'a-1', label: 'Uno' });
      expect(onChange).toHaveBeenCalledWith('a-1');
      expect(onTouched).toHaveBeenCalled();

      component.setDisabledState(true);
      component['toggle']();
      expect(component['open']()).toBe(false);
    });

    it('opens with Enter/ArrowDown and navigates options from the keyboard', () => {
      fixture.componentRef.setInput('options', [
        { value: 1, label: 'Uno' },
        { value: 2, label: 'Dos' },
        { value: 3, label: 'Tres' },
      ]);
      fixture.detectChanges();

      const key = (k: string) => component['onTriggerKeydown'](new KeyboardEvent('keydown', { key: k, cancelable: true }));

      key('ArrowDown');
      expect(component['open']()).toBe(true);

      key('ArrowDown');
      key('End');
      expect(component['activeIndex']()).toBe(2);
      key('Home');
      expect(component['activeIndex']()).toBe(0);
      key('ArrowUp');
      expect(component['activeIndex']()).toBe(0);

      const emitted: unknown[] = [];
      component.valueChange.subscribe(v => emitted.push(v));
      key('Enter');
      expect(emitted).toEqual([1]);
      expect(component['open']()).toBe(false);

      key('ArrowDown');
      key('Escape');
      expect(component['open']()).toBe(false);
    });
  });

});
