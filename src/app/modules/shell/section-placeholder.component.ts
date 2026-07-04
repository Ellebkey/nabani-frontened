import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Generic "en construcción" screen for the Nabani sections whose real screens
 * ship later (Planeación · Producción · Pacientes · Finanzas · Catálogos). Reads
 * the route's `title` data so the sidebar section, the browser tab and this
 * pagehead all read the same label. Keeps the frame fully navigable.
 */
@Component({
  selector: 'app-section-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    <div class="flex w-full max-w-screen-xl flex-col mx-auto p-4 sm:p-6 md:p-8">
      <div class="mb-5 flex items-start gap-4">
        <div class="min-w-0">
          <h1 class="text-[23px] font-bold tracking-[-0.01em] text-ink">{{ heading() }}</h1>
          <div class="mt-0.5 text-[13px] text-ink-3">Sección en construcción</div>
        </div>
      </div>
      <div class="rounded-card bg-card p-6 text-[14px] text-ink-2">
        Esta sección estará disponible próximamente.
      </div>
    </div>
  `,
})
export class SectionPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly heading = signal<string>(
    (this.route.snapshot.data['title'] as string | undefined) ?? 'Nabani',
  );
}
