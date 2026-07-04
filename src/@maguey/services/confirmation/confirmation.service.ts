import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MagueyConfirmationConfig } from '@maguey/services/confirmation/confirmation.types';
import { MagueyConfirmationDialogComponent } from '@maguey/services/confirmation/dialog/dialog.component';
import { merge } from 'lodash-es';

@Injectable({providedIn: 'root'})
export class MagueyConfirmationService
{
    private readonly _matDialog = inject(MatDialog);
    private readonly _defaultConfig: MagueyConfirmationConfig = {
        title      : 'Confirm action',
        message    : 'Are you sure you want to confirm this action?',
        icon       : {
            show : true,
            name : 'heroicons_outline:exclamation-triangle',
            color: 'warn',
        },
        actions    : {
            confirm: {
                show : true,
                label: 'Confirm',
                color: 'warn',
            },
            cancel : {
                show : true,
                label: 'Cancel',
            },
        },
        dismissible: false,
    };

    open(config: MagueyConfirmationConfig = {}): MatDialogRef<MagueyConfirmationDialogComponent>
    {
        // Merge the user config with the default config
        const userConfig = merge({}, this._defaultConfig, config);

        // Open the dialog
        return this._matDialog.open(MagueyConfirmationDialogComponent, {
            autoFocus   : false,
            disableClose: !userConfig.dismissible,
            data        : userConfig,
            panelClass  : 'mg-confirmation-dialog-panel',
        });
    }
}
