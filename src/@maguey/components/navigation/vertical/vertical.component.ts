import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';

import { AfterViewInit, booleanAttribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, DOCUMENT, ElementRef, HostBinding, HostListener, inject, Input, input, OnChanges, OnDestroy, OnInit, output, Renderer2, signal, SimpleChanges, viewChild, viewChildren, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { magueyAnimations } from '@maguey/animations';
import { MagueyNavigationService } from '@maguey/components/navigation/navigation.service';
import { MagueyNavigationItem, MagueyVerticalNavigationAppearance, MagueyVerticalNavigationMode, MagueyVerticalNavigationPosition } from '@maguey/components/navigation/navigation.types';
import { MagueyVerticalNavigationAsideItemComponent } from '@maguey/components/navigation/vertical/components/aside/aside.component';
import { MagueyVerticalNavigationBasicItemComponent } from '@maguey/components/navigation/vertical/components/basic/basic.component';
import { MagueyVerticalNavigationCollapsableItemComponent } from '@maguey/components/navigation/vertical/components/collapsable/collapsable.component';
import { MagueyVerticalNavigationDividerItemComponent } from '@maguey/components/navigation/vertical/components/divider/divider.component';
import { MagueyVerticalNavigationGroupItemComponent } from '@maguey/components/navigation/vertical/components/group/group.component';
import { MagueyVerticalNavigationSpacerItemComponent } from '@maguey/components/navigation/vertical/components/spacer/spacer.component';
import { MagueyScrollbarDirective } from '@maguey/directives/scrollbar/scrollbar.directive';
import { MagueyUtilsService } from '@maguey/services/utils/utils.service';
import { delay, filter, merge, ReplaySubject } from 'rxjs';

@Component({
    selector: 'mg-vertical-navigation',
    templateUrl: './vertical.component.html',
    styleUrls: ['./vertical.component.scss'],
    animations: magueyAnimations,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'magueyVerticalNavigation',
    imports: [MagueyScrollbarDirective, MagueyVerticalNavigationAsideItemComponent, MagueyVerticalNavigationBasicItemComponent, MagueyVerticalNavigationCollapsableItemComponent, MagueyVerticalNavigationDividerItemComponent, MagueyVerticalNavigationGroupItemComponent, MagueyVerticalNavigationSpacerItemComponent]
})
export class MagueyVerticalNavigationComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy
{
    private _animationBuilder = inject(AnimationBuilder);
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);
    private _document = inject<Document>(DOCUMENT);
    private _elementRef = inject(ElementRef);
    private _renderer2 = inject(Renderer2);
    private _router = inject(Router);
    private _scrollStrategyOptions = inject(ScrollStrategyOptions);
    private _magueyNavigationService = inject(MagueyNavigationService);
    private _magueyUtilsService = inject(MagueyUtilsService);

    readonly appearance = input<MagueyVerticalNavigationAppearance>('default');
    readonly autoCollapse = input(true);
    readonly inner = input(false, {transform: booleanAttribute});
    readonly mode = input<MagueyVerticalNavigationMode>('side');
    readonly navigation = input.required<MagueyNavigationItem[]>();
    readonly position = input<MagueyVerticalNavigationPosition>('left');
    readonly transparentOverlay = input(false, {transform: booleanAttribute});

    // 'name' and 'opened' are reassigned internally (random id fallback and the
    // open/close/toggle API), so they stay as signal-backed @Input pairs
    // instead of read-only input() signals.
    private readonly _name = signal<string>(this._magueyUtilsService.randomId());
    @Input() set name(value: string)
    {
        this._name.set(value);
    }
    get name(): string
    {
        return this._name();
    }

    private readonly _opened = signal(true);
    @Input() set opened(value: BooleanInput)
    {
        this._opened.set(coerceBooleanProperty(value));
    }
    get opened(): boolean
    {
        return this._opened();
    }

    readonly appearanceChanged = output<MagueyVerticalNavigationAppearance>();
    readonly modeChanged = output<MagueyVerticalNavigationMode>();
    readonly openedChanged = output<boolean>();
    readonly positionChanged = output<MagueyVerticalNavigationPosition>();

    readonly activeAsideItemId = signal<string | null>(null);
    onCollapsableItemCollapsed: ReplaySubject<MagueyNavigationItem> = new ReplaySubject<MagueyNavigationItem>(1);
    onCollapsableItemExpanded: ReplaySubject<MagueyNavigationItem> = new ReplaySubject<MagueyNavigationItem>(1);
    onRefreshed: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);

    private readonly _navigationContentEl = viewChild<ElementRef>('navigationContent');
    private readonly _magueyScrollbarDirectives = viewChildren(MagueyScrollbarDirective);

    private readonly _animationsEnabled = signal(false);
    private readonly _hovered = signal(false);
    private _asideOverlay: HTMLElement | null = null;
    private readonly _handleAsideOverlayClick: () => void;
    private readonly _handleOverlayClick: () => void;
    private _mutationObserver!: MutationObserver;
    private _overlay: HTMLElement | null = null;
    private _player!: AnimationPlayer;
    private _scrollStrategy: ScrollStrategy = this._scrollStrategyOptions.block();

    /**
     * Constructor
     */
    constructor()
    {
        this._handleAsideOverlayClick = (): void =>
        {
            this.closeAside();
        };
        this._handleOverlayClick = (): void =>
        {
            this.close();
        };

        // Update the scrollbars on collapsable items' collapse/expand
        merge(
            this.onCollapsableItemCollapsed,
            this.onCollapsableItemExpanded,
        )
            .pipe(
                takeUntilDestroyed(),
                delay(250),
            )
            .subscribe(() =>
            {
                this._magueyScrollbarDirectives().forEach((magueyScrollbarDirective) =>
                {
                    magueyScrollbarDirective.update();
                });
            });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Host binding for component classes
     */
    @HostBinding('class') get classList(): any
    {

        return {
            'mg-vertical-navigation-animations-enabled'               : this._animationsEnabled(),
            [`mg-vertical-navigation-appearance-${this.appearance()}`]: true,
            'mg-vertical-navigation-hover'                            : this._hovered(),
            'mg-vertical-navigation-inner'                            : this.inner(),
            'mg-vertical-navigation-mode-over'                        : this.mode() === 'over',
            'mg-vertical-navigation-mode-side'                        : this.mode() === 'side',
            'mg-vertical-navigation-opened'                           : this.opened,
            'mg-vertical-navigation-position-left'                    : this.position() === 'left',
            'mg-vertical-navigation-position-right'                   : this.position() === 'right',
        };

    }

    /**
     * Host binding for component inline styles
     */
    @HostBinding('style') get styleList(): any
    {
        return {
            'visibility': this.opened ? 'visible' : 'hidden',
        };
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Decorated methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * On mouseenter
     *
     * @private
     */
    @HostListener('mouseenter')
    protected _onMouseenter(): void
    {
        // Enable the animations
        this._enableAnimations();

        // Set the hovered
        this._hovered.set(true);
    }

    /**
     * On mouseleave
     *
     * @private
     */
    @HostListener('mouseleave')
    protected _onMouseleave(): void
    {
        // Enable the animations
        this._enableAnimations();

        // Set the hovered
        this._hovered.set(false);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On changes
     *
     * Kept (signal inputs still populate SimpleChanges) because the mode
     * transition needs the previous/current value pair and precise timing
     * around the overlay and animation toggling.
     *
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges): void
    {
        // Appearance
        if ( 'appearance' in changes )
        {
            // Execute the observable
            this.appearanceChanged.emit(changes.appearance.currentValue);
        }

        // Mode
        if ( 'mode' in changes )
        {
            // Get the previous and current values
            const currentMode = changes.mode.currentValue;
            const previousMode = changes.mode.previousValue;

            // Disable the animations
            this._disableAnimations();

            // If the mode changes: 'over -> side'
            if ( previousMode === 'over' && currentMode === 'side' )
            {
                // Hide the overlay
                this._hideOverlay();
            }

            // If the mode changes: 'side -> over'
            if ( previousMode === 'side' && currentMode === 'over' )
            {
                // Close the aside
                this.closeAside();

                // If the navigation is opened
                if ( this.opened )
                {
                    // Show the overlay
                    this._showOverlay();
                }
            }

            // Execute the observable
            this.modeChanged.emit(currentMode);

            // Enable the animations after a delay
            // The delay must be bigger than the current transition-duration
            // to make sure nothing will be animated while the mode changing
            setTimeout(() =>
            {
                this._enableAnimations();
            }, 500);
        }

        // Opened
        if ( 'opened' in changes )
        {
            // Open/close the navigation
            this._toggleOpened(this.opened);
        }

        // Position
        if ( 'position' in changes )
        {
            // Execute the observable
            this.positionChanged.emit(changes.position.currentValue);
        }
    }

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Make sure the name input is not an empty string
        if ( this.name === '' )
        {
            this._name.set(this._magueyUtilsService.randomId());
        }

        // Register the navigation component
        this._magueyNavigationService.registerComponent(this.name, this);

        // Subscribe to the 'NavigationEnd' event
        this._router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntilDestroyed(this._destroyRef),
            )
            .subscribe(() =>
            {
                // If the mode is 'over' and the navigation is opened...
                if ( this.mode() === 'over' && this.opened )
                {
                    // Close the navigation
                    this.close();
                }

                // If the mode is 'side' and the aside is active...
                if ( this.mode() === 'side' && this.activeAsideItemId() )
                {
                    // Close the aside
                    this.closeAside();
                }
            });
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void
    {
        // Fix for Firefox.
        //
        // Because 'position: sticky' doesn't work correctly inside a 'position: fixed' parent,
        // adding the '.cdk-global-scrollblock' to the html element breaks the navigation's position.
        // This fixes the problem by reading the 'top' value from the html element and adding it as a
        // 'marginTop' to the navigation itself.
        this._mutationObserver = new MutationObserver((mutations) =>
        {
            mutations.forEach((mutation) =>
            {
                const mutationTarget = mutation.target as HTMLElement;
                if ( mutation.attributeName === 'class' )
                {
                    if ( mutationTarget.classList.contains('cdk-global-scrollblock') )
                    {
                        const top = parseInt(mutationTarget.style.top, 10);
                        this._renderer2.setStyle(this._elementRef.nativeElement, 'margin-top', `${Math.abs(top)}px`);
                    }
                    else
                    {
                        this._renderer2.setStyle(this._elementRef.nativeElement, 'margin-top', null);
                    }
                }
            });
        });
        this._mutationObserver.observe(this._document.documentElement, {
            attributes     : true,
            attributeFilter: ['class'],
        });

        setTimeout(() =>
        {
            // Return if 'navigation content' element does not exist
            const navigationContentEl = this._navigationContentEl();
            if ( !navigationContentEl )
            {
                return;
            }

            // If 'navigation content' element doesn't have
            // perfect scrollbar activated on it...
            if ( !navigationContentEl.nativeElement.classList.contains('ps') )
            {
                // Find the active item
                const activeItem = navigationContentEl.nativeElement.querySelector('.mg-vertical-navigation-item-active');

                // If the active item exists, scroll it into view
                if ( activeItem )
                {
                    activeItem.scrollIntoView();
                }
            }
            // Otherwise
            else
            {
                // Go through all the scrollbar directives
                this._magueyScrollbarDirectives().forEach((magueyScrollbarDirective) =>
                {
                    // Skip if not enabled
                    if ( !magueyScrollbarDirective.isEnabled() )
                    {
                        return;
                    }

                    // Scroll to the active element
                    magueyScrollbarDirective.scrollToElement('.mg-vertical-navigation-item-active', -120, true);
                });
            }
        });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Disconnect the mutation observer
        this._mutationObserver.disconnect();

        // Forcefully close the navigation and aside in case they are opened
        this.close();
        this.closeAside();

        // Deregister the navigation component from the registry
        this._magueyNavigationService.deregisterComponent(this.name);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Refresh the component to apply the changes
     */
    refresh(): void
    {
        // Mark for check
        this._changeDetectorRef.markForCheck();

        // Execute the observable
        this.onRefreshed.next(true);
    }

    /**
     * Open the navigation
     */
    open(): void
    {
        // Return if the navigation is already open
        if ( this.opened )
        {
            return;
        }

        // Set the opened
        this._toggleOpened(true);
    }

    /**
     * Close the navigation
     */
    close(): void
    {
        // Return if the navigation is already closed
        if ( !this.opened )
        {
            return;
        }

        // Close the aside
        this.closeAside();

        // Set the opened
        this._toggleOpened(false);
    }

    /**
     * Toggle the navigation
     */
    toggle(): void
    {
        // Toggle
        if ( this.opened )
        {
            this.close();
        }
        else
        {
            this.open();
        }
    }

    /**
     * Open the aside
     *
     * @param item
     */
    openAside(item: MagueyNavigationItem): void
    {
        // Return if the item is disabled
        if ( item.disabled || !item.id )
        {
            return;
        }

        // Open
        this.activeAsideItemId.set(item.id);

        // Show the aside overlay
        this._showAsideOverlay();
    }

    /**
     * Close the aside
     */
    closeAside(): void
    {
        // Close
        this.activeAsideItemId.set(null);

        // Hide the aside overlay
        this._hideAsideOverlay();
    }

    /**
     * Toggle the aside
     *
     * @param item
     */
    toggleAside(item: MagueyNavigationItem): void
    {
        // Toggle
        if ( this.activeAsideItemId() === item.id )
        {
            this.closeAside();
        }
        else
        {
            this.openAside(item);
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
     * Enable the animations
     *
     * @private
     */
    private _enableAnimations(): void
    {
        // Return if the animations are already enabled
        if ( this._animationsEnabled() )
        {
            return;
        }

        // Enable the animations
        this._animationsEnabled.set(true);
    }

    /**
     * Disable the animations
     *
     * @private
     */
    private _disableAnimations(): void
    {
        // Return if the animations are already disabled
        if ( !this._animationsEnabled() )
        {
            return;
        }

        // Disable the animations
        this._animationsEnabled.set(false);
    }

    /**
     * Show the overlay
     *
     * @private
     */
    private _showOverlay(): void
    {
        // Return if there is already an overlay
        if ( this._asideOverlay )
        {
            return;
        }

        // Create the overlay element
        this._overlay = this._renderer2.createElement('div') as HTMLElement;

        // Add a class to the overlay element
        this._overlay.classList.add('mg-vertical-navigation-overlay');

        // Add a class depending on the transparentOverlay option
        if ( this.transparentOverlay() )
        {
            this._overlay.classList.add('mg-vertical-navigation-overlay-transparent');
        }

        // Append the overlay to the parent of the navigation
        this._renderer2.appendChild(this._elementRef.nativeElement.parentElement, this._overlay);

        // Enable block scroll strategy
        this._scrollStrategy.enable();

        // Create the enter animation and attach it to the player
        this._player = this._animationBuilder.build([
            animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({opacity: 1})),
        ]).create(this._overlay);

        // Play the animation
        this._player.play();

        // Add an event listener to the overlay
        this._overlay.addEventListener('click', this._handleOverlayClick);
    }

    /**
     * Hide the overlay
     *
     * @private
     */
    private _hideOverlay(): void
    {
        if ( !this._overlay )
        {
            return;
        }

        // Create the leave animation and attach it to the player
        this._player = this._animationBuilder.build([
            animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({opacity: 0})),
        ]).create(this._overlay);

        // Play the animation
        this._player.play();

        // Once the animation is done...
        this._player.onDone(() =>
        {
            // If the overlay still exists...
            if ( this._overlay )
            {
                // Remove the event listener
                this._overlay.removeEventListener('click', this._handleOverlayClick);

                // Remove the overlay
                this._overlay.parentNode!.removeChild(this._overlay);
                this._overlay = null;
            }

            // Disable block scroll strategy
            this._scrollStrategy.disable();
        });
    }

    /**
     * Show the aside overlay
     *
     * @private
     */
    private _showAsideOverlay(): void
    {
        // Return if there is already an overlay
        if ( this._asideOverlay )
        {
            return;
        }

        // Create the aside overlay element
        this._asideOverlay = this._renderer2.createElement('div') as HTMLElement;

        // Add a class to the aside overlay element
        this._asideOverlay.classList.add('mg-vertical-navigation-aside-overlay');

        // Append the aside overlay to the parent of the navigation
        this._renderer2.appendChild(this._elementRef.nativeElement.parentElement, this._asideOverlay);

        // Create the enter animation and attach it to the player
        this._player =
            this._animationBuilder
                .build([
                    animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({opacity: 1})),
                ]).create(this._asideOverlay);

        // Play the animation
        this._player.play();

        // Add an event listener to the aside overlay
        this._asideOverlay.addEventListener('click', this._handleAsideOverlayClick);
    }

    /**
     * Hide the aside overlay
     *
     * @private
     */
    private _hideAsideOverlay(): void
    {
        if ( !this._asideOverlay )
        {
            return;
        }

        // Create the leave animation and attach it to the player
        this._player =
            this._animationBuilder
                .build([
                    animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({opacity: 0})),
                ]).create(this._asideOverlay);

        // Play the animation
        this._player.play();

        // Once the animation is done...
        this._player.onDone(() =>
        {
            // If the aside overlay still exists...
            if ( this._asideOverlay )
            {
                // Remove the event listener
                this._asideOverlay.removeEventListener('click', this._handleAsideOverlayClick);

                // Remove the aside overlay
                this._asideOverlay.parentNode!.removeChild(this._asideOverlay);
                this._asideOverlay = null;
            }
        });
    }

    /**
     * Open/close the navigation
     *
     * @param open
     * @private
     */
    private _toggleOpened(open: boolean): void
    {
        // Set the opened
        this._opened.set(open);

        // Enable the animations
        this._enableAnimations();

        // If the navigation opened, and the mode
        // is 'over', show the overlay
        if ( this.mode() === 'over' )
        {
            if ( open )
            {
                this._showOverlay();
            }
            else
            {
                this._hideOverlay();
            }
        }

        // Execute the observable
        this.openedChanged.emit(open);
    }
}
