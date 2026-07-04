import { booleanAttribute, ChangeDetectionStrategy, Component, effect, inject, input, ViewEncapsulation } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MagueyLoadingService } from '@maguey/services/loading';

@Component({
    selector: 'mg-loading-bar',
    templateUrl: './loading-bar.component.html',
    styleUrls: ['./loading-bar.component.scss'],
    encapsulation: ViewEncapsulation.None,
    exportAs: 'magueyLoadingBar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatProgressBarModule]
})
export class MagueyLoadingBarComponent
{
    private readonly _magueyLoadingService = inject(MagueyLoadingService);

    readonly autoMode = input(true, { transform: booleanAttribute });

    // Zoneless: the service streams must land in signals or the bar never
    // re-renders (it kept animating after loads finished)
    readonly mode = toSignal(this._magueyLoadingService.mode$, { initialValue: 'indeterminate' as const });
    readonly progress = toSignal(this._magueyLoadingService.progress$, { initialValue: 0 });
    readonly show = toSignal(this._magueyLoadingService.show$, { initialValue: false });

    constructor()
    {
        effect(() => this._magueyLoadingService.setAutoMode(this.autoMode()));
    }
}
