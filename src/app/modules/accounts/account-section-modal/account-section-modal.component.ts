import { Component, OnInit, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HotToastService } from '@ngxpert/hot-toast';
import { MagueyConfirmationService } from '@maguey/services/confirmation';

import { AccountsService } from '../accounts.service';
import { CommonService } from '@shared/services/common.service';
import { IAccount, IAccountSection } from '@shared/interfaces/account.model';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';
import { RowSkeletonComponent } from '../../shared/components/skeleton/row-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TileComponent } from '../../shared/components/tile/tile.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { CurrencyPipe } from '@angular/common';

interface SectionModalData {
  accounts: IAccount[];
  preSelectedAccountId: string;
}

const SPLITBAR_COLORS = ['rgb(var(--maguey-brand))', 'rgb(var(--maguey-brand-tint-2))', '#8FA98C'];

@Component({
    selector: 'app-account-section-modal',
    templateUrl: './account-section-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalShellComponent, RowSkeletonComponent, EmptyStateComponent, TileComponent, MatIcon, FormsModule, ReactiveFormsModule, MatButton, CurrencyPipe]
})
export class AccountSectionModalComponent implements OnInit {
  private accountService = inject(AccountsService);
  private commonService = inject(CommonService);
  private magueyConfirmationService = inject(MagueyConfirmationService);
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<AccountSectionModalComponent>>(MatDialogRef);
  private toast = inject(HotToastService);
  data = inject<SectionModalData>(MAT_DIALOG_DATA);


  // The modal is always opened with a preSelectedAccountId taken from data.accounts
  readonly account = signal<IAccount>(this.data.accounts.find(a => a.id === this.data.preSelectedAccountId)!);
  readonly sections = signal<IAccountSection[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);

  readonly adjustingId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly adjustForm: FormGroup = this.fb.group({
    movementType: ['deposit', Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
  });
  readonly editForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    targetAmount: [null, [Validators.min(0.01)]],
  });
  readonly createForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    targetAmount: [null, [Validators.min(0.01)]],
    initialDeposit: [null, [Validators.min(0)]],
  });

  private changed = false;

  readonly apartadoTotal = computed<number>(() =>
    this.sections().reduce((sum, section) => sum + Number(section.currentAmount || 0), 0));

  readonly disponible = computed<number>(() => Number(this.account()?.currentAmount || 0));

  readonly saldoTotal = computed<number>(() => this.disponible() + this.apartadoTotal());

  // Zoneless: reactive-form state read in the template must come through signals
  readonly adjustValue = toSignal(this.adjustForm.valueChanges, { initialValue: this.adjustForm.value });
  readonly adjustStatus = toSignal(this.adjustForm.statusChanges, { initialValue: this.adjustForm.status });
  readonly adjustInvalid = computed(() => this.adjustStatus() !== 'VALID');

  ngOnInit(): void {
    this.loadSections();
  }

  private loadSections(): void {
    this.isLoading.set(true);
    this.accountService.getAccountSections(this.account().id).subscribe({
      next: (sections) => {
        this.sections.set(sections);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar los apartados');
        this.isLoading.set(false);
      },
    });
  }

  splitSegments(): { width: number; color: string }[] {
    const total = this.saldoTotal();
    if (total <= 0) {
      return [];
    }
    return this.sections()
      .filter(section => Number(section.currentAmount) > 0)
      .map((section, index) => ({
        width: (Number(section.currentAmount) / total) * 100,
        color: SPLITBAR_COLORS[index % SPLITBAR_COLORS.length],
      }));
  }

  progressPercent(section: IAccountSection): number | null {
    if (!section.targetAmount || Number(section.targetAmount) <= 0) {
      return null;
    }
    return Math.min((Number(section.currentAmount) / Number(section.targetAmount)) * 100, 100);
  }

  progressMeta(section: IAccountSection): string {
    const current = this.formatAmount(Number(section.currentAmount || 0));
    const percent = this.progressPercent(section);
    if (percent === null) {
      return `${current} · sin objetivo`;
    }
    const target = this.formatAmount(Number(section.targetAmount));
    const label = percent >= 100 ? 'completo' : `${Math.round(percent)}%`;
    return `${current} de ${target} · ${label}`;
  }

  private formatAmount(value: number): string {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  toggleAdjust(section: IAccountSection): void {
    if (this.adjustingId() === section.id) {
      this.adjustingId.set(null);
      return;
    }
    this.editingId.set(null);
    this.adjustingId.set(section.id);
    this.adjustForm.reset({ movementType: 'deposit', amount: null });
  }

  toggleEdit(section: IAccountSection): void {
    if (this.editingId() === section.id) {
      this.editingId.set(null);
      return;
    }
    this.adjustingId.set(null);
    this.editingId.set(section.id);
    this.editForm.reset({ name: section.name, targetAmount: section.targetAmount ?? null });
  }

  setAdjustType(type: 'deposit' | 'withdrawal'): void {
    this.adjustForm.patchValue({ movementType: type });
  }

  adjustMax(section: IAccountSection): number {
    return this.adjustValue().movementType === 'deposit'
      ? this.disponible()
      : Number(section.currentAmount || 0);
  }

  adjustExceeds(section: IAccountSection): boolean {
    return Number(this.adjustValue().amount || 0) > this.adjustMax(section);
  }

  adjustPreview(section: IAccountSection): number {
    const amount = Number(this.adjustValue().amount || 0);
    const current = Number(section.currentAmount || 0);
    return this.adjustValue().movementType === 'deposit' ? current + amount : current - amount;
  }

  confirmAdjust(section: IAccountSection): void {
    if (this.adjustForm.invalid || this.adjustExceeds(section) || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    const { movementType, amount } = this.adjustForm.value;
    const movementDate = this.commonService.combineDateAndTime(new Date(), this.currentTime());

    this.accountService.updateSection({
      subAccountId: section.id,
      accountId: this.account().id,
      amount: Number(amount),
      movementType,
      movementDate,
    } as never).subscribe({
      next: (updated) => {
        const delta = Number(amount) * (movementType === 'deposit' ? 1 : -1);
        const newAmount = Number(updated?.currentAmount ?? Number(section.currentAmount) + delta);
        this.sections.update(items => items.map(item =>
          item.id === section.id ? { ...item, currentAmount: newAmount } : item));
        this.account.update(a => ({ ...a, currentAmount: Number(a.currentAmount) - delta }));
        this.changed = true;
        this.adjustingId.set(null);
        this.isSaving.set(false);
        this.toast.success(movementType === 'deposit' ? 'Depósito registrado' : 'Retiro registrado');
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error('Error al registrar el movimiento');
      },
    });
  }

  saveEdit(section: IAccountSection): void {
    if (this.editForm.invalid || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    const { name, targetAmount } = this.editForm.value;

    this.accountService.updateSectionDetails(section.id, {
      name: name.trim(),
      targetAmount: targetAmount ? Number(targetAmount) : null,
    }).subscribe({
      next: (updated) => {
        const newName = updated?.name ?? name.trim();
        const newTarget = updated?.targetAmount ?? (targetAmount ? Number(targetAmount) : null);
        this.sections.update(items => items.map(item =>
          item.id === section.id ? { ...item, name: newName, targetAmount: newTarget } : item));
        this.changed = true;
        this.editingId.set(null);
        this.isSaving.set(false);
        this.toast.success('Apartado actualizado');
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error('Error al actualizar el apartado');
      },
    });
  }

  deleteSection(section: IAccountSection): void {
    const dialogData = this.commonService.getDefaultDeleteConfirmation({ objectName: 'apartado' });
    this.magueyConfirmationService.open(dialogData).afterClosed().subscribe((result) => {
      if (result !== 'confirmed') {
        return;
      }
      this.isSaving.set(true);
      this.accountService.deleteSection(section.id).subscribe({
        next: () => {
          this.account.update(a => ({ ...a, currentAmount: Number(a.currentAmount) + Number(section.currentAmount || 0) }));
          this.sections.update(items => items.filter(item => item.id !== section.id));
          this.changed = true;
          this.isSaving.set(false);
          this.toast.success('Apartado eliminado; el saldo regresó al disponible');
        },
        error: () => {
          this.isSaving.set(false);
          this.toast.error('Error al eliminar el apartado');
        },
      });
    });
  }

  createSection(): void {
    if (this.createForm.invalid || this.isSaving()) {
      return;
    }
    const { name, targetAmount, initialDeposit } = this.createForm.value;
    const deposit = Number(initialDeposit || 0);
    if (deposit > this.disponible()) {
      this.toast.error('El depósito inicial excede el disponible');
      return;
    }

    this.isSaving.set(true);
    this.accountService.createSection({
      accountId: this.account().id,
      name: name.trim(),
      targetAmount: targetAmount ? Number(targetAmount) : null,
      initialDeposit: deposit > 0 ? deposit : undefined,
      movementDate: this.commonService.combineDateAndTime(new Date(), this.currentTime()),
    }).subscribe({
      next: (created) => {
        this.sections.update(items => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
        this.account.update(a => ({ ...a, currentAmount: Number(a.currentAmount) - deposit }));
        this.changed = true;
        this.isSaving.set(false);
        this.createForm.reset();
        this.toast.success(`Apartado "${created.name}" creado`);
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error('Error al crear el apartado');
      },
    });
  }

  private currentTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  closeDialog(): void {
    this.dialogRef.close(this.changed ? true : undefined);
  }
}
