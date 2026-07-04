import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';

import { PillComponent } from './pill/pill.component';
import { TileComponent } from './tile/tile.component';
import { DotComponent } from './dot/dot.component';
import { TransactionRowComponent } from './transaction-row/transaction-row.component';
import { DateRowComponent } from './transaction-row/date-row.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { SkeletonComponent } from './skeleton/skeleton.component';
import { RowSkeletonComponent } from './skeleton/row-skeleton.component';
import { ModalShellComponent } from './modal-shell/modal-shell.component';

@Component({
    imports: [
        PillComponent,
        TileComponent,
        DotComponent,
        TransactionRowComponent,
        DateRowComponent,
        EmptyStateComponent,
        SkeletonComponent,
        RowSkeletonComponent,
        ModalShellComponent,
    ],
    // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- test host re-checks freely
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <mg-pill variant="tint" size="sm" color="#C9A45C">Comida</mg-pill>
    <mg-pill variant="solid" color="#3B5F82">BBVA Débito ·5695</mg-pill>
    <mg-pill variant="outline">Transporte</mg-pill>

    <mg-tile color="#3B5F82"></mg-tile>
    <mg-tile size="sm" [neutral]="true"></mg-tile>

    <mg-dot color="#4E8A6A"></mg-dot>

    <mg-date-row label="Mar — 30 de junio" sum="$1,016.00"></mg-date-row>

    <mg-transaction-row
      rid="INV-10633"
      title="WAHA"
      color="#3B5F82"
      icon="heroicons_outline:credit-card"
      amount="$116.00">
      <ng-container mgRowMeta>Apoyo WAHA · 15:27</ng-container>
      <button mgRowActions type="button">expandir</button>
    </mg-transaction-row>

    <mg-transaction-row
      [noIcon]="true"
      rid="INC-474"
      title="Nómina"
      amount="+$45,222.00"
      amountTone="in"
      amountMeta="$52,001.10">
    </mg-transaction-row>

    <mg-empty-state icon="heroicons_outline:chart-pie" title="Sin presupuestos" message="Crea uno para empezar.">
      <button type="button">Crear</button>
    </mg-empty-state>

    <mg-skeleton class="h-3 w-24"></mg-skeleton>
    <mg-row-skeleton></mg-row-skeleton>

    <mg-modal-shell title="Actualizar gasto" subtitle="INV-10627">
      <p>cuerpo</p>
      <span mgModalInfo>Total $5,496.20</span>
      <button mgModalActions type="button">Actualizar</button>
    </mg-modal-shell>
  `
})
class SmokeHostComponent {}

describe('Componentes Maguey (smoke)', () => {
  it('renderiza todos los componentes compartidos con sus inputs y proyecciones', () => {
    TestBed.configureTestingModule({
      imports: [SmokeHostComponent, MatIconTestingModule],
    });

    const fixture = TestBed.createComponent(SmokeHostComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('mg-pill').length).toBe(3);
    expect(el.querySelector('mg-pill')!.className).toContain('tint');
    expect(el.querySelectorAll('mg-tile').length).toBe(3);
    expect(el.textContent).toContain('INV-10633');
    expect(el.textContent).toContain('+$45,222.00');
    expect(el.textContent).toContain('Sin presupuestos');
    expect(el.textContent).toContain('Actualizar gasto');
    expect(el.querySelector('mg-row-skeleton mg-skeleton')).toBeTruthy();
  });
});
