import { Component, ChangeDetectionStrategy, computed, effect, signal, input, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { PacientesService } from '../../pacientes.service';
import { IConsultation, MEDICION_COLUMNS } from '../../pacientes.models';

interface MedicionRow {
  consultation: IConsultation;
  weightDelta: number | null;
}

interface ChartBar {
  label: string;
  weight: number;
  heightPct: number;
  isLast: boolean;
}

@Component({
  selector: 'app-clinico-tab',
  templateUrl: './clinico-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, EmptyStateComponent],
})
export class ClinicoTabComponent {
  private pacientesService = inject(PacientesService);

  readonly patientId = input.required<number>();
  readonly reloadTick = input(0);

  readonly consultations = signal<IConsultation[]>([]);
  readonly isLoaded = signal(false);

  protected readonly medicionColumns = MEDICION_COLUMNS;

  // Most-recent first, with a weight delta vs the previous (older) consultation.
  readonly rows = computed<MedicionRow[]>(() => {
    const sorted = [...this.consultations()].sort(
      (a, b) => this.time(b.consultDate) - this.time(a.consultDate)
    );
    return sorted.map((consultation, index) => {
      const previous = sorted[index + 1];
      const delta = (consultation.weight != null && previous?.weight != null)
        ? Number((consultation.weight - previous.weight).toFixed(1))
        : null;
      return { consultation, weightDelta: delta };
    });
  });

  readonly chartBars = computed<ChartBar[]>(() => {
    const ascending = [...this.consultations()]
      .filter(c => c.weight != null)
      .sort((a, b) => this.time(a.consultDate) - this.time(b.consultDate))
      .slice(-6);
    if (!ascending.length) return [];
    const weights = ascending.map(c => c.weight as number);
    const max = Math.max(...weights);
    const min = Math.min(...weights);
    const span = max - min || 1;
    return ascending.map((c, i) => ({
      label: this.monthLabel(c.consultDate),
      weight: c.weight as number,
      heightPct: 40 + Math.round(((c.weight as number) - min) / span * 60),
      isLast: i === ascending.length - 1,
    }));
  });

  metric(consultation: IConsultation, key: keyof IConsultation): string {
    const value = consultation[key];
    return value == null || value === '' ? '—' : `${value}`;
  }

  constructor() {
    effect(() => {
      const id = this.patientId();
      this.reloadTick();
      if (id) this.load(id);
    });
  }

  private load(id: number): void {
    this.isLoaded.set(false);
    this.pacientesService.getConsultations(id).subscribe({
      next: (response) => {
        this.consultations.set(response.rows ?? []);
        this.isLoaded.set(true);
      },
      error: (err) => {
        console.error(err);
        this.consultations.set([]);
        this.isLoaded.set(true);
      },
    });
  }

  private time(dateStr: string | null | undefined): number {
    if (!dateStr) return 0;
    try {
      return parseISO(dateStr).getTime();
    } catch {
      return 0;
    }
  }

  private monthLabel(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM', { locale: es });
    } catch {
      return '';
    }
  }
}
