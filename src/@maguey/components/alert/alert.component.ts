import { booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Input, input, OnInit, output, signal, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { magueyAnimations } from '@maguey/animations';
import { MagueyAlertService } from '@maguey/components/alert/alert.service';
import { MagueyAlertAppearance, MagueyAlertType } from '@maguey/components/alert/alert.types';
import { MagueyUtilsService } from '@maguey/services/utils/utils.service';
import { filter } from 'rxjs';

@Component({
    selector: 'mg-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: magueyAnimations,
    exportAs: 'magueyAlert',
    host: {
        '[class]': 'classList()',
    },
    imports: [MatIconModule, MatButtonModule]
})
export class MagueyAlertComponent implements OnInit
{
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _magueyAlertService = inject(MagueyAlertService);
    private readonly _magueyUtilsService = inject(MagueyUtilsService);

    readonly appearance = input<MagueyAlertAppearance>('soft');
    readonly dismissible = input(false, { transform: booleanAttribute });
    readonly name = input<string>(this._magueyUtilsService.randomId());
    readonly showIcon = input(true, { transform: booleanAttribute });
    readonly type = input<MagueyAlertType>('primary');
    readonly dismissedChanged = output<boolean>();

    private readonly _dismissed = signal(false);

    // dismiss()/show() reassign this internally, so it cannot be an input();
    // it stays a signal-backed @Input() setter/getter pair.
    @Input({ transform: booleanAttribute })
    set dismissed(value: boolean)
    {
        this._dismissed.set(value);
        this._toggleDismiss(value);
    }
    get dismissed(): boolean
    {
        return this._dismissed();
    }

    protected readonly classList = computed(() => ({
        'mg-alert-appearance-border' : this.appearance() === 'border',
        'mg-alert-appearance-fill'   : this.appearance() === 'fill',
        'mg-alert-appearance-outline': this.appearance() === 'outline',
        'mg-alert-appearance-soft'   : this.appearance() === 'soft',
        'mg-alert-dismissed'         : this._dismissed(),
        'mg-alert-dismissible'       : this.dismissible(),
        'mg-alert-show-icon'         : this.showIcon(),
        'mg-alert-type-primary'      : this.type() === 'primary',
        'mg-alert-type-accent'       : this.type() === 'accent',
        'mg-alert-type-warn'         : this.type() === 'warn',
        'mg-alert-type-basic'        : this.type() === 'basic',
        'mg-alert-type-info'         : this.type() === 'info',
        'mg-alert-type-success'      : this.type() === 'success',
        'mg-alert-type-warning'      : this.type() === 'warning',
        'mg-alert-type-error'        : this.type() === 'error',
    }));

    // The service streams are ReplaySubject(1)-backed; subscribing in ngOnInit
    // (after the name input is set) preserves which replayed value this
    // instance reacts to.
    ngOnInit(): void
    {
        this._magueyAlertService.onDismiss
            .pipe(
                filter(name => this.name() === name),
                takeUntilDestroyed(this._destroyRef),
            )
            .subscribe(() => this.dismiss());

        this._magueyAlertService.onShow
            .pipe(
                filter(name => this.name() === name),
                takeUntilDestroyed(this._destroyRef),
            )
            .subscribe(() => this.show());
    }

    /**
     * Dismiss the alert
     */
    dismiss(): void
    {
        if ( this._dismissed() )
        {
            return;
        }

        this._toggleDismiss(true);
    }

    /**
     * Show the dismissed alert
     */
    show(): void
    {
        if ( !this._dismissed() )
        {
            return;
        }

        this._toggleDismiss(false);
    }

    private _toggleDismiss(dismissed: boolean): void
    {
        // Only dismissible alerts toggle and notify
        if ( !this.dismissible() )
        {
            return;
        }

        this._dismissed.set(dismissed);
        this.dismissedChanged.emit(dismissed);
    }
}
