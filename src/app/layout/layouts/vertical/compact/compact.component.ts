import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MagueyLoadingBarComponent } from '@maguey/components/loading-bar';
import { MagueyNavigationItem } from '@maguey/components/navigation';
import { ThemeService } from 'app/core/theme/theme.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { UserComponent } from 'app/layout/common/user/user.component';
import { MagueyAlertComponent } from '@root/@maguey/components/alert';
import { AlertService, AlertConfig } from 'app/modules/shared/services/alert.service';

/**
 * Nabani shell (design-spec §2.1): 92px brand sidebar (logo + 6 sections) +
 * 60px white topbar (global search · bell · user block) + page area.
 */
@Component({
    selector: 'compact-layout',
    templateUrl: './compact.component.html',
    styleUrls: ['./compact.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MagueyLoadingBarComponent,
        MatIconModule,
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        UserComponent,
        MagueyAlertComponent,
    ]
})
export class CompactLayoutComponent implements OnInit
{
    private readonly _navigationService = inject(NavigationService);
    private readonly _themeService = inject(ThemeService);
    private readonly _alertService = inject(AlertService);
    private readonly _destroyRef = inject(DestroyRef);

    /** The role-filtered sidebar sections (Finanzas + Catálogos are admin-only). */
    readonly navigation = signal<MagueyNavigationItem[]>([]);
    readonly alertConfig = toSignal<AlertConfig | null>(this._alertService.currentAlert$, { initialValue: null });

    ngOnInit(): void
    {
        // Apply the persisted theme (light · dark · system)
        this._themeService.init();

        this._navigationService.get()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((navigation: MagueyNavigationItem[]) =>
            {
                this.navigation.set(navigation);
            });
    }

    /** Stub: the global search modal (Búsqueda global) ships in a later phase. */
    openSearch(): void
    {
        // no-op for now — wires to the `buscar` modal (design-spec §5) later
    }
}
