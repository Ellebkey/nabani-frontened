import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

@Component({
    selector: 'mg-row-skeleton',
    template: `
    <mg-skeleton class="h-[42px] w-[42px] flex-none !rounded-tile"></mg-skeleton>
    <div class="flex min-w-0 grow flex-col gap-1.5">
      <mg-skeleton class="h-3 w-[70%]"></mg-skeleton>
      <mg-skeleton class="h-2.5 w-[45%]"></mg-skeleton>
    </div>
    <mg-skeleton class="h-3.5 w-16 flex-none"></mg-skeleton>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SkeletonComponent],
    host: {
        class: 'flex items-center gap-3.5 px-5 py-[13px]',
    }
})
export class RowSkeletonComponent {}
