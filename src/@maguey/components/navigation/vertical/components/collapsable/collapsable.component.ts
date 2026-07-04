import { booleanAttribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, forwardRef, HostBinding, inject, input, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router } from '@angular/router';
import { magueyAnimations } from '@maguey/animations';
import { MagueyNavigationService } from '@maguey/components/navigation/navigation.service';
import { MagueyNavigationItem } from '@maguey/components/navigation/navigation.types';
import { MagueyVerticalNavigationBasicItemComponent } from '@maguey/components/navigation/vertical/components/basic/basic.component';
import { MagueyVerticalNavigationDividerItemComponent } from '@maguey/components/navigation/vertical/components/divider/divider.component';
import { MagueyVerticalNavigationGroupItemComponent } from '@maguey/components/navigation/vertical/components/group/group.component';
import { MagueyVerticalNavigationSpacerItemComponent } from '@maguey/components/navigation/vertical/components/spacer/spacer.component';
import { MagueyVerticalNavigationComponent } from '@maguey/components/navigation/vertical/vertical.component';
import { filter } from 'rxjs';

@Component({
    selector: 'mg-vertical-navigation-collapsable-item',
    templateUrl: './collapsable.component.html',
    animations: magueyAnimations,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, MatTooltipModule, MatIconModule, MagueyVerticalNavigationBasicItemComponent, forwardRef(() => MagueyVerticalNavigationCollapsableItemComponent), MagueyVerticalNavigationDividerItemComponent, MagueyVerticalNavigationGroupItemComponent, MagueyVerticalNavigationSpacerItemComponent]
})
export class MagueyVerticalNavigationCollapsableItemComponent implements OnInit
{
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);
    private _router = inject(Router);
    private _magueyNavigationService = inject(MagueyNavigationService);

    readonly autoCollapse = input(false, {transform: booleanAttribute});
    readonly item = input.required<MagueyNavigationItem>();
    readonly name = input.required<string>();

    readonly isCollapsed = signal(true);
    readonly isExpanded = computed(() => !this.isCollapsed());
    private _magueyVerticalNavigationComponent!: MagueyVerticalNavigationComponent;

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Host binding for component classes
     */
    @HostBinding('class') get classList(): any
    {

        return {
            'mg-vertical-navigation-item-collapsed': this.isCollapsed(),
            'mg-vertical-navigation-item-expanded' : this.isExpanded(),
        };

    }

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

        // If the item has a children that has a matching url with the current url, expand...
        if ( this._hasActiveChild(this.item(), this._router.url) )
        {
            this.expand();
        }
        // Otherwise...
        else
        {
            // If the autoCollapse is on, collapse...
            if ( this.autoCollapse() )
            {
                this.collapse();
            }
        }

        // Listen for the onCollapsableItemCollapsed from the service
        this._magueyVerticalNavigationComponent.onCollapsableItemCollapsed
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((collapsedItem) =>
            {
                // Check if the collapsed item is null
                if ( collapsedItem === null )
                {
                    return;
                }

                // Collapse if this is a children of the collapsed item
                if ( this._isChildrenOf(collapsedItem, this.item()) )
                {
                    this.collapse();
                }
            });

        // Listen for the onCollapsableItemExpanded from the service if the autoCollapse is on
        if ( this.autoCollapse() )
        {
            this._magueyVerticalNavigationComponent.onCollapsableItemExpanded
                .pipe(takeUntilDestroyed(this._destroyRef))
                .subscribe((expandedItem) =>
                {
                    // Check if the expanded item is null
                    if ( expandedItem === null )
                    {
                        return;
                    }

                    // Check if this is a parent of the expanded item
                    if ( this._isChildrenOf(this.item(), expandedItem) )
                    {
                        return;
                    }

                    // Check if this has a children with a matching url with the current active url
                    if ( this._hasActiveChild(this.item(), this._router.url) )
                    {
                        return;
                    }

                    // Check if this is the expanded item
                    if ( this.item() === expandedItem )
                    {
                        return;
                    }

                    // If none of the above conditions are matched, collapse this item
                    this.collapse();
                });
        }

        // Attach a listener to the NavigationEnd event
        this._router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this._destroyRef),
            )
            .subscribe((event: NavigationEnd) =>
            {
                // If the item has a children that has a matching url with the current url, expand...
                if ( this._hasActiveChild(this.item(), event.urlAfterRedirects) )
                {
                    this.expand();
                }
                // Otherwise...
                else
                {
                    // If the autoCollapse is on, collapse...
                    if ( this.autoCollapse() )
                    {
                        this.collapse();
                    }
                }
            });

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

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Collapse
     */
    collapse(): void
    {
        // Return if the item is disabled
        if ( this.item().disabled )
        {
            return;
        }

        // Return if the item is already collapsed
        if ( this.isCollapsed() )
        {
            return;
        }

        // Collapse it
        this.isCollapsed.set(true);

        // Execute the observable
        this._magueyVerticalNavigationComponent.onCollapsableItemCollapsed.next(this.item());
    }

    /**
     * Expand
     */
    expand(): void
    {
        // Return if the item is disabled
        if ( this.item().disabled )
        {
            return;
        }

        // Return if the item is already expanded
        if ( !this.isCollapsed() )
        {
            return;
        }

        // Expand it
        this.isCollapsed.set(false);

        // Execute the observable
        this._magueyVerticalNavigationComponent.onCollapsableItemExpanded.next(this.item());
    }

    /**
     * Toggle collapsable
     */
    toggleCollapsable(): void
    {
        // Toggle collapse/expand
        if ( this.isCollapsed() )
        {
            this.expand();
        }
        else
        {
            this.collapse();
        }
    }

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

            // Check if the child has a link and is active
            if ( child.link && this._router.isActive(child.link, child.exactMatch || false) )
            {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if this is a children
     * of the given item
     *
     * @param parent
     * @param item
     * @private
     */
    private _isChildrenOf(parent: MagueyNavigationItem, item: MagueyNavigationItem): boolean
    {
        const children = parent.children;

        if ( !children )
        {
            return false;
        }

        if ( children.indexOf(item) > -1 )
        {
            return true;
        }

        for ( const child of children )
        {
            if ( child.children )
            {
                if ( this._isChildrenOf(child, item) )
                {
                    return true;
                }
            }
        }

        return false;
    }
}
