import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';

@Component({
    selector: 'app-invite-link-modal',
    templateUrl: './invite-link-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        ModalShellComponent
    ]
})
export class InviteLinkModalComponent {
  private dialogRef = inject<MatDialogRef<InviteLinkModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  data = inject<{
    token: string;
    email: string;
}>(MAT_DIALOG_DATA);

  protected readonly copied = signal(false);
  protected readonly inviteLink: string;

  constructor() {
    const data = this.data;

    this.inviteLink = `${window.location.origin}/#/family/accept?token=${data.token}`;
  }

  protected copyLink(): void {
    navigator.clipboard.writeText(this.inviteLink).then(() => {
      this.copied.set(true);
      this.toast.success('Enlace copiado al portapapeles');
    });
  }

  protected closeDialog(): void {
    this.dialogRef.close();
  }
}
