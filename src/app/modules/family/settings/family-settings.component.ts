import { Component, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MagueyConfirmationService } from '@maguey/services/confirmation';
import { HotToastService } from '@ngxpert/hot-toast';

import { CategoriesApiService } from '@app/modules/admin/categories-management/services/api/categories-api.service';
import { ICategory } from '@shared/interfaces/common.model';
import { FamilyApiService } from '../services/api/family-api.service';
import { FamilyStateService } from '../services/state/family-state.service';
import { MatMenuModule } from '@angular/material/menu';
import { NoPartnershipComponent } from '../components/no-partnership/no-partnership.component';
import { InviteLinkModalComponent } from '../modals/invite-link-modal/invite-link-modal.component';
import { IPartnershipMember } from '../models/family.model';
import { PillComponent } from '@shared/components/pill/pill.component';
import { DotComponent } from '@shared/components/dot/dot.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { RowSkeletonComponent } from '@shared/components/skeleton/row-skeleton.component';

@Component({
    selector: 'app-family-settings',
    templateUrl: './family-settings.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DatePipe,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        MatMenuModule,
        NoPartnershipComponent,
        PillComponent,
        DotComponent,
        SkeletonComponent,
        RowSkeletonComponent
    ]
})
export class FamilySettingsComponent {
  private readonly api = inject(FamilyApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(HotToastService);
  private readonly magueyConfirmation = inject(MagueyConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly familyState = inject(FamilyStateService);

  protected readonly isPremium = this.familyState.isPremium();
  protected menuMember!: IPartnershipMember;
  protected readonly inviteEmail = new FormControl('', [Validators.required, Validators.email]);
  protected readonly sendingInvite = signal(false);
  protected readonly allCategories = signal<ICategory[]>([]);
  protected readonly selectedCategoryIds = signal<Set<number>>(new Set());

  protected readonly canInvite = computed(() =>
    this.familyState.isOwner() && this.familyState.members().length < 2
  );

  protected readonly categoriesDirty = computed(() => {
    const current = new Set(this.familyState.excludedCategories().map(category => category.categoryId));
    const selected = this.selectedCategoryIds();
    if (current.size !== selected.size) {
      return true;
    }
    return [...selected].some(id => !current.has(id));
  });

  private readonly syncSelectionWithState = effect(() => {
    const excludedIds = this.familyState.excludedCategories().map(category => category.categoryId);
    this.selectedCategoryIds.set(new Set(excludedIds));
  }, { allowSignalWrites: true });

  private readonly loadDependencies = effect(() => {
    if (this.familyState.loaded() && this.familyState.hasPartnership()) {
      this.familyState.loadInvites();
      this.loadCategories();
    }
  });

  constructor() {
    this.familyState.ensureLoaded();
  }

  protected memberName(member: IPartnershipMember): string {
    return member.fullname || member.username || 'Miembro';
  }

  protected memberInitials(member: IPartnershipMember): string {
    const name = this.memberName(member);
    const parts = name.replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  }

  protected isSelf(member: IPartnershipMember): boolean {
    return member.username === this.familyState.currentMember()?.username;
  }

  protected toggleCategory(categoryId: number): void {
    if (!this.familyState.isOwner()) {
      return;
    }

    this.selectedCategoryIds.update(selected => {
      const next = new Set(selected);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  protected saveExcludedCategories(): void {
    this.familyState.setExcludedCategories([...this.selectedCategoryIds()]);
  }

  protected sendInvite(): void {
    if (this.inviteEmail.invalid || this.sendingInvite()) {
      return;
    }

    const email = this.inviteEmail.value as string;
    this.sendingInvite.set(true);

    this.api.createInvite(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invite) => {
          this.sendingInvite.set(false);
          this.inviteEmail.reset('');
          this.familyState.loadInvites();
          this.dialog.open(InviteLinkModalComponent, {
            width: '460px',
            disableClose: true,
            data: { token: invite.token, email }
          });
        },
        error: (error) => {
          const messagesByStatus: Record<number, string> = {
            403: 'Solo el dueño (Premium) puede enviar invitaciones',
            422: 'El hogar ya está completo'
          };
          this.toast.error(messagesByStatus[error?.status] ?? 'Error al crear la invitación');
          this.sendingInvite.set(false);
        }
      });
  }

  protected revokeInvite(id: string): void {
    this.familyState.revokeInvite(id);
  }

  protected confirmRemoveMember(member: IPartnershipMember): void {
    const self = this.isSelf(member);

    const confirmDialog = this.magueyConfirmation.open({
      title: self ? 'Salir del hogar' : 'Eliminar miembro',
      message: self
        ? 'Dejarás de ver los gastos compartidos del hogar. Tus datos personales no se ven afectados.'
        : `<b>${member.username}</b> dejará de tener acceso al hogar inmediatamente.`,
      actions: {
        confirm: { show: true, label: self ? 'Salir' : 'Eliminar', color: 'warn' },
        cancel: { show: true, label: 'Cancelar' }
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result === 'confirmed') {
        this.familyState.removeMember(member.id, self);
      }
    });
  }

  protected confirmDissolve(): void {
    const confirmDialog = this.magueyConfirmation.open({
      title: 'Disolver hogar',
      message: 'Ambos perderán la vista compartida y los presupuestos del hogar. Los gastos personales de cada quien no se modifican. Esta acción no se puede deshacer.',
      actions: {
        confirm: { show: true, label: 'Disolver', color: 'warn' },
        cancel: { show: true, label: 'Cancelar' }
      },
      dismissible: false
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result === 'confirmed') {
        this.familyState.dissolve();
      }
    });
  }

  private loadCategories(): void {
    this.categoriesApi.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.allCategories.set(categories),
        error: () => this.toast.error('Error al cargar las categorías')
      });
  }
}
