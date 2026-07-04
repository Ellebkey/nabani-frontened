import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { MagueyNavigationService } from '@maguey/components/navigation/navigation.service';
import { MagueyNavigationItem } from '@maguey/components/navigation/navigation.types';
import { MagueyVerticalNavigationComponent } from '@maguey/components/navigation/vertical/vertical.component';
import { MagueyUtilsService } from '@maguey/services/utils/utils.service';

@Component({
    selector: 'mg-vertical-navigation-basic-item',
    templateUrl: './basic.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, RouterLink, RouterLinkActive, MatTooltipModule, NgTemplateOutlet, MatIconModule]
})
export class MagueyVerticalNavigationBasicItemComponent implements OnInit
{
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);
    private _magueyNavigationService = inject(MagueyNavigationService);
    private _magueyUtilsService = inject(MagueyUtilsService);

    readonly item = input.required<MagueyNavigationItem>();
    readonly name = input.required<string>();

    // Set the "isActiveMatchOptions" either from item's
    // "isActiveMatchOptions" or the equivalent form of
    // item's "exactMatch" option. The grouping mirrors the original
    // `a ?? b ? x : y` expression, which parses as `(a ?? b) ? x : y`.
    readonly isActiveMatchOptions = computed<IsActiveMatchOptions>(() =>
        (this.item().isActiveMatchOptions ?? this.item().exactMatch)
            ? this._magueyUtilsService.exactMatchOptions
            : this._magueyUtilsService.subsetMatchOptions,
    );

    private _magueyVerticalNavigationComponent!: MagueyVerticalNavigationComponent;

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Get the parent navigation component
        this._magueyVerticalNavigationComponent = this._magueyNavigationService.getComponent(this.name());

        // Subscribe to onRefreshed on the navigation component: the navigation
        // items are mutated in place, so an explicit re-render is required
        this._magueyVerticalNavigationComponent.onRefreshed
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe(() =>
            {
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }
}
