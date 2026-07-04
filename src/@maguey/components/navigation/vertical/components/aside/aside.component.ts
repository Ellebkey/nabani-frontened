import { booleanAttribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, inject, input, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router } from '@angular/router';
import { MagueyNavigationService } from '@maguey/components/navigation/navigation.service';
import { MagueyNavigationItem } from '@maguey/components/navigation/navigation.types';
import { MagueyVerticalNavigationBasicItemComponent } from '@maguey/components/navigation/vertical/components/basic/basic.component';
import { MagueyVerticalNavigationCollapsableItemComponent } from '@maguey/components/navigation/vertical/components/collapsable/collapsable.component';
import { MagueyVerticalNavigationDividerItemComponent } from '@maguey/components/navigation/vertical/components/divider/divider.component';
import { MagueyVerticalNavigationGroupItemComponent } from '@maguey/components/navigation/vertical/components/group/group.component';
import { MagueyVerticalNavigationSpacerItemComponent } from '@maguey/components/navigation/vertical/components/spacer/spacer.component';
import { MagueyVerticalNavigationComponent } from '@maguey/components/navigation/vertical/vertical.component';
import { filter, map } from 'rxjs';

@Component({
    selector: 'mg-vertical-navigation-aside-item',
    templateUrl: './aside.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, MatTooltipModule, MatIconModule, MagueyVerticalNavigationBasicItemComponent, MagueyVerticalNavigationCollapsableItemComponent, MagueyVerticalNavigationDividerItemComponent, MagueyVerticalNavigationGroupItemComponent, MagueyVerticalNavigationSpacerItemComponent]
})
export class MagueyVerticalNavigationAsideItemComponent implements OnInit
{
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);
    private _router = inject(Router);
    private _magueyNavigationService = inject(MagueyNavigationService);

    readonly activeItemId = input('');
    readonly autoCollapse = input(false, {transform: booleanAttribute});
    readonly item = input.required<MagueyNavigationItem>();
    readonly name = input.required<string>();
    readonly skipChildren = input(false, {transform: booleanAttribute});

    private readonly _currentUrl = toSignal(
        this._router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map(event => event.urlAfterRedirects),
        ),
        {initialValue: this._router.url},
    );

    // The aside is active when it is the opened one, or when one of its
    // children matches the current url (replaces the imperative _markIfActive)
    readonly active = computed(() =>
        this.activeItemId() === this.item().id || this._hasActiveChild(this.item(), this._currentUrl()));

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

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Check if the given item has the given url
     * in one of its children
     *
     * @param item
     * @param currentUrl
     * @private
     */
    private _hasActiveChild(item: MagueyNavigationItem, currentUrl: string): boolean
    {
        const children = item.children;

        if ( !children )
        {
            return false;
        }

        for ( const child of children )
        {
            if ( child.children )
            {
                if ( this._hasActiveChild(child, currentUrl) )
                {
                    return true;
                }
            }

            // Skip items other than 'basic'
            if ( child.type !== 'basic' )
            {
                continue;
            }

            // Check if the child has a link and is active
            if ( child.link && this._router.isActive(child.link, child.exactMatch || false) )
            {
                return true;
            }
        }

        return false;
    }
}
