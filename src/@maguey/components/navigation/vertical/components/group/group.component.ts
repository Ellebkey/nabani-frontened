import { booleanAttribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, forwardRef, inject, input, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MagueyNavigationService } from '@maguey/components/navigation/navigation.service';
import { MagueyNavigationItem } from '@maguey/components/navigation/navigation.types';
import { MagueyVerticalNavigationBasicItemComponent } from '@maguey/components/navigation/vertical/components/basic/basic.component';
import { MagueyVerticalNavigationCollapsableItemComponent } from '@maguey/components/navigation/vertical/components/collapsable/collapsable.component';
import { MagueyVerticalNavigationDividerItemComponent } from '@maguey/components/navigation/vertical/components/divider/divider.component';
import { MagueyVerticalNavigationSpacerItemComponent } from '@maguey/components/navigation/vertical/components/spacer/spacer.component';
import { MagueyVerticalNavigationComponent } from '@maguey/components/navigation/vertical/vertical.component';

@Component({
    selector: 'mg-vertical-navigation-group-item',
    templateUrl: './group.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, MatIconModule, MagueyVerticalNavigationBasicItemComponent, MagueyVerticalNavigationCollapsableItemComponent, MagueyVerticalNavigationDividerItemComponent, forwardRef(() => MagueyVerticalNavigationGroupItemComponent), MagueyVerticalNavigationSpacerItemComponent]
})
export class MagueyVerticalNavigationGroupItemComponent implements OnInit
{
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);
    private _magueyNavigationService = inject(MagueyNavigationService);

    readonly autoCollapse = input(false, {transform: booleanAttribute});
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

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }
}
