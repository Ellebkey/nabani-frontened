import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TitleService } from './core/title.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet],
})
export class AppComponent implements OnInit {
    private readonly titleService = inject(TitleService);

    ngOnInit(): void {
        this.titleService.init();
    }
}
