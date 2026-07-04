import { Component, OnInit, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';

import { CatalogosService } from '../../catalogos.service';
import { IUser, ROLE_OPTIONS } from '../../catalogos.models';

interface DialogData {
  user?: IUser;
  isEditMode?: boolean;
}

@Component({
  selector: 'app-usuario-modal',
  templateUrl: './usuario-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ReactiveFormsModule, ModalShellComponent, MatButton, MatProgressSpinner,
  ],
})
export class UsuarioModalComponent implements OnInit {
  private catalogosService = inject(CatalogosService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<UsuarioModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  private data = inject<DialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly form: FormGroup = this.fb.group({
    username: [null, Validators.required],
    email: [null, [Validators.required, Validators.email]],
    fullname: [null, Validators.required],
    password: [null],
  });

  private readonly formEvents = toSignal(this.form.events);
  readonly formDisabled = computed(() => { this.formEvents(); return this.form.disabled; });

  readonly isEditMode = signal(false);
  readonly title = computed(() => this.isEditMode() ? 'Editar usuario' : 'Nuevo usuario');
  readonly selectedRoles = signal<Set<string>>(new Set());
  readonly roleOptions = ROLE_OPTIONS;

  ngOnInit(): void {
    const user = this.data?.user;
    if (this.data?.isEditMode && user) {
      this.isEditMode.set(true);
      this.form.patchValue({
        username: user.username,
        email: user.email,
        fullname: user.fullname,
      });
      this.selectedRoles.set(new Set(user.roles ?? []));
    }
  }

  isRoleSelected(role: string): boolean {
    return this.selectedRoles().has(role);
  }

  toggleRole(role: string): void {
    this.selectedRoles.update(set => {
      const next = new Set(set);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  }

  showError(controlName: string): boolean {
    this.formEvents();
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.form.disable();
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      username: raw.username,
      email: raw.email,
      fullname: raw.fullname,
      roles: Array.from(this.selectedRoles()),
    };
    if (!this.isEditMode() && raw.password) {
      payload['password'] = raw.password;
    }

    const save$ = this.isEditMode()
      ? this.catalogosService.updateUser(this.data!.user!.id, payload as never)
      : this.catalogosService.saveUser(payload as never);

    const messages = this.isEditMode()
      ? { loading: 'Actualizando...', success: 'Usuario actualizado exitosamente', error: 'Error al actualizar el usuario' }
      : { loading: 'Guardando...', success: 'Usuario creado exitosamente', error: 'Error al guardar el usuario' };

    save$.pipe(
      this.toast.observe(messages),
      catchError((err) => {
        this.form.enable();
        console.error(err);
        return of(null);
      }),
    ).subscribe({
      next: (response) => {
        if (response) {
          setTimeout(() => this.dialogRef.close(response), 400);
        }
      },
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
