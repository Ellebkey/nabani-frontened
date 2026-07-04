import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MagueyNavigationService } from '@maguey/components/navigation/navigation.service';
import { MagueyNavigationItem } from '@maguey/components/navigation/navigation.types';
import { MagueyVerticalNavigationComponent } from '@maguey/components/navigation/vertical/vertical.component';

@Component({
    selector: 'mg-vertical-navigation-spacer-item',
    templateUrl: './spacer.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass]
})
export class MagueyVerticalNavigationSpacerItemComponent implements OnInit
{
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);
    private _magueyNavigationService = inject(MagueyNavigationService);

    readonly item = input.required<MagueyNavigationItem>();
    readonly name = input.required<string>();

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Get the parent navigation component
        const magueyVerticalNavigationComponent = this._magueyNavigationService.getComponent<MagueyVerticalNavigationComponent>(this.name());

        // Subscribe to onRefreshed on the navigation component: the navigation
        // items are mutated in place, so an explicit re-render is required
        magueyVerticalNavigationComponent.onRefreshed
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe(() =>
            {
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }
}
