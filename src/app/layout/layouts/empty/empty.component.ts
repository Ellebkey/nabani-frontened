import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MagueyLoadingBarComponent } from '@maguey/components/loading-bar';

@Component({
    selector: 'empty-layout',
    templateUrl: './empty.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MagueyLoadingBarComponent, RouterOutlet]
})
export class EmptyLayoutComponent
{
}
