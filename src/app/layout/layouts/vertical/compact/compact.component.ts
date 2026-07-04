import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { MagueyLoadingBarComponent } from '@maguey/components/loading-bar';
import {
  MagueyNavigationItem,
  MagueyNavigationService,
  MagueyVerticalNavigationComponent
} from '@maguey/components/navigation';
import { MagueyMediaWatcherService } from '@maguey/services/media-watcher';
import { ThemeService } from 'app/core/theme/theme.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { DraftNotificationComponent } from 'app/layout/common/draft-notification/draft-notification.component';
import { UserComponent } from 'app/layout/common/user/user.component';
import { MagueyAlertComponent } from '@root/@maguey/components/alert';
import { AlertService, AlertConfig } from 'app/modules/shared/services/alert.service';

@Component({
    selector: 'compact-layout',
    templateUrl: './compact.component.html',
    styleUrls: ['./compact.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MagueyLoadingBarComponent, MatButtonModule, MatIconModule, DraftNotificationComponent, UserComponent, RouterOutlet, MagueyVerticalNavigationComponent, MagueyAlertComponent]
})
export class CompactLayoutComponent implements OnInit
{
    private readonly _navigationService = inject(NavigationService);
    private readonly _magueyMediaWatcherService = inject(MagueyMediaWatcherService);
    private readonly _magueyNavigationService = inject(MagueyNavigationService);
    private readonly _themeService = inject(ThemeService);
    private readonly _alertService = inject(AlertService);
    private readonly _destroyRef = inject(DestroyRef);

    readonly navigation = signal<MagueyNavigationItem[]>([]);
    readonly isScreenSmall = signal(false);
    readonly alertConfig = toSignal<AlertConfig | null>(this._alertService.currentAlert$, { initialValue: null });

    get resolvedScheme(): 'light' | 'dark'
    {
        return this._themeService.resolvedScheme();
    }

    toggleScheme(): void
    {
        this._themeService.toggle();
    }

    get currentYear(): number
    {
        return new Date().getFullYear();
    }

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

        this._magueyMediaWatcherService.onMediaChange$
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe(({matchingAliases}) =>
            {
                this.isScreenSmall.set(!matchingAliases.includes('md'));
            });
    }

    /**
     * Toggle navigation
     *
     * @param name
     */
    toggleNavigation(name: string): void
    {
        // Get the navigation
        const navigation = this._magueyNavigationService.getComponent<MagueyVerticalNavigationComponent>(name);

        if ( navigation )
        {
            // Toggle the opened status
            navigation.toggle();
        }
    }
}
