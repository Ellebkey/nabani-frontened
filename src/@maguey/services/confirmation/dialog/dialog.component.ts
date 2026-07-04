import { NgClass } from '@angular/common';
import { Component, ViewEncapsulation, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MagueyConfirmationConfigResolved } from '@maguey/services/confirmation/confirmation.types';

@Component({
    selector: 'mg-confirmation-dialog',
    templateUrl: './dialog.component.html',
    styleUrl: './dialog.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatDialogModule, MatIconModule, NgClass]
})
export class MagueyConfirmationDialogComponent
{
    // This dialog is only opened by MagueyConfirmationService.open(), which
    // deep-merges the caller's config into its complete _defaultConfig, so
    // every field is guaranteed to be present here.
    readonly data = inject<MagueyConfirmationConfigResolved>(MAT_DIALOG_DATA);
}
