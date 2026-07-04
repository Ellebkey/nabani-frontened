import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotToastService } from '@ngxpert/hot-toast';

import { AuthService } from '@app/core/auth/auth.service';
import { FamilyApiService } from '../api/family-api.service';
import { IPartnership, IPartnershipInvite } from '../../models/family.model';

@Injectable({ providedIn: 'root' })
export class FamilyStateService {
  private readonly api = inject(FamilyApiService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(HotToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly partnershipSignal = signal<IPartnership | null>(null);
  private readonly loadedSignal = signal(false);
  private readonly loadingSignal = signal(false);
  private readonly invitesSignal = signal<IPartnershipInvite[]>([]);

  readonly partnership = this.partnershipSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly invites = this.invitesSignal.asReadonly();

  readonly hasPartnership = computed(() => this.partnershipSignal() !== null);
  readonly members = computed(() => this.partnershipSignal()?.members ?? []);
  readonly excludedCategories = computed(() => this.partnershipSignal()?.excludedCategories ?? []);

  readonly currentMember = computed(() =>
    this.members().find(member => member.username === this.authService.getUsername()) ?? null
  );

  readonly partnerMember = computed(() =>
    this.members().find(member => member.username !== this.authService.getUsername()) ?? null
  );

  readonly isOwner = computed(() => this.currentMember()?.role === 'owner');

  readonly memberNamesById = computed(() => {
    const names: Record<string, string> = {};
    this.members().forEach(member => {
      names[member.userId] = member.fullname || member.username || 'Miembro';
    });
    return names;
  });

  readonly pendingInvites = computed(() =>
    this.invitesSignal().filter(invite => invite.status === 'pending')
  );

  isPremium(): boolean {
    return this.authService.userHasRole('premium') || this.authService.isAdmin();
  }

  ensureLoaded(): void {
    if (!this.loadedSignal() && !this.loadingSignal()) {
      this.loadPartnership();
    }
  }

  loadPartnership(): void {
    this.loadingSignal.set(true);

    this.api.getMyPartnership()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (partnership) => {
          this.partnershipSignal.set(partnership?.id ? partnership : null);
          this.loadedSignal.set(true);
          this.loadingSignal.set(false);
        },
        error: () => {
          this.toast.error('Error al cargar el hogar');
          this.loadedSignal.set(true);
          this.loadingSignal.set(false);
        }
      });
  }

  setPartnership(partnership: IPartnership | null): void {
    this.partnershipSignal.set(partnership);
    this.loadedSignal.set(true);
  }

  createPartnership(name?: string): void {
    this.loadingSignal.set(true);

    this.api.createPartnership({ name: name?.trim() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (partnership) => {
          this.partnershipSignal.set(partnership);
          this.toast.success('Hogar creado exitosamente');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          const messagesByStatus: Record<number, string> = {
            403: 'Necesitas una cuenta Premium para crear un hogar',
            409: 'Ya tienes un hogar activo'
          };
          this.toast.error(messagesByStatus[error?.status] ?? 'Error al crear el hogar');
          this.loadingSignal.set(false);
        }
      });
  }

  loadInvites(): void {
    this.api.getInvites()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invites) => this.invitesSignal.set(invites),
        error: () => this.toast.error('Error al cargar las invitaciones')
      });
  }

  revokeInvite(id: string): void {
    this.api.revokeInvite(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.invitesSignal.update(invites => invites.filter(invite => invite.id !== id));
          this.toast.success('Invitación revocada');
        },
        error: () => this.toast.error('Error al revocar la invitación')
      });
  }

  removeMember(memberId: string, isSelf: boolean): void {
    this.loadingSignal.set(true);

    this.api.removeMember(memberId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(isSelf ? 'Has salido del hogar' : 'Miembro eliminado del hogar');
          this.loadPartnership();
        },
        error: (error) => {
          const messagesByStatus: Record<number, string> = {
            422: 'El dueño no puede salir; disuelve el hogar en su lugar'
          };
          this.toast.error(messagesByStatus[error?.status] ?? 'Error al eliminar el miembro');
          this.loadingSignal.set(false);
        }
      });
  }

  dissolve(): void {
    this.loadingSignal.set(true);

    this.api.dissolvePartnership()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.partnershipSignal.set(null);
          this.invitesSignal.set([]);
          this.toast.success('Hogar disuelto');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          const messagesByStatus: Record<number, string> = {
            403: 'Solo el dueño puede disolver el hogar'
          };
          this.toast.error(messagesByStatus[error?.status] ?? 'Error al disolver el hogar');
          this.loadingSignal.set(false);
        }
      });
  }

  setExcludedCategories(categoryIds: number[]): void {
    this.loadingSignal.set(true);

    this.api.setExcludedCategories(categoryIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (excludedCategories) => {
          this.partnershipSignal.update(partnership =>
            partnership ? { ...partnership, excludedCategories } : partnership
          );
          this.toast.success('Categorías personales actualizadas');
          this.loadingSignal.set(false);
        },
        error: (error) => {
          const messagesByStatus: Record<number, string> = {
            403: 'Solo el dueño puede modificar las categorías personales'
          };
          this.toast.error(messagesByStatus[error?.status] ?? 'Error al actualizar las categorías');
          this.loadingSignal.set(false);
        }
      });
  }
}
