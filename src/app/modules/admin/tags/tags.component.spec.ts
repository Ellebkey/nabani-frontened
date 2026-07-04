import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { TagsComponent } from './tags.component';
import { TagFormModalComponent } from './modals/tag-form-modal/tag-form-modal.component';
import { TagsStateService } from './services/state/tags-state.service';
import { ITag } from '@shared/interfaces/tag.model';
import { PaginationSetting } from '@shared/interfaces/shared.model';

const viajeTag: ITag = { id: 1, name: 'Viaje', color: '#3B82F6', description: 'Vacaciones 2026' };
const casaTag: ITag = { id: 2, name: 'Casa', color: '#22C55E' };

const createStateMock = () => ({
  tags: signal<ITag[]>([viajeTag, casaTag]),
  loading: signal(false),
  error: signal<string | null>(null),
  isEmpty: signal(false),
  pagination: signal<PaginationSetting>({
    limit: 25, offset: 0, searchText: null, count: 2, showInputSearch: true
  }),
  loadTags: jest.fn(),
  updatePagination: jest.fn(),
  createTag: jest.fn(),
  updateTag: jest.fn(),
  deleteTag: jest.fn()
});

describe('TagsComponent', () => {
  let fixture: ComponentFixture<TagsComponent>;
  let component: TagsComponent;
  let state: ReturnType<typeof createStateMock>;
  let dialog: { open: jest.Mock };
  let dialogResult: unknown;
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    dialogResult = undefined;
    state = createStateMock();
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })) };
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    TestBed.configureTestingModule({
      imports: [TagsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: TagsStateService, useValue: state },
        { provide: MatDialog, useValue: dialog }
      ]
    });

    // MatDialogModule (imported by the component) provides its own MatDialog,
    // which shadows TestBed-level providers; overrideProvider wins everywhere.
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  const createComponent = (): void => {
    fixture = TestBed.createComponent(TagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('initialization and rendering', () => {
    it('should load the tags on init', () => {
      createComponent();

      expect(state.loadTags).toHaveBeenCalledTimes(1);
    });

    it('should render the header and the tag cards', () => {
      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Etiquetas');
      expect(text).toContain('Nueva etiqueta');
      expect(text).toContain('Viaje');
      expect(text).toContain('Vacaciones 2026');
      expect(text).toContain('Casa');
    });

    it('should render the Spanish empty state when there are no tags and no search', () => {
      state.tags.set([]);
      state.isEmpty.set(true);

      createComponent();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No hay etiquetas registradas');
      expect(text).toContain('Crear primera etiqueta');
    });

    it('should not show the empty state while a search filter is active', () => {
      state.tags.set([]);
      state.isEmpty.set(true);
      state.pagination.set({ limit: 25, offset: 0, searchText: 'viaje', count: 0, showInputSearch: true });

      createComponent();

      expect(fixture.nativeElement.textContent).not.toContain('No hay etiquetas registradas');
    });
  });

  it('should delegate pagination changes to the state service', () => {
    createComponent();

    component['onPageChange']({ limit: 10, offset: 20 });

    expect(state.updatePagination).toHaveBeenCalledWith({ limit: 10, offset: 20 });
  });

  describe('create modal', () => {
    it('should open the form modal in create mode and create the returned tag', () => {
      dialogResult = { name: 'Navidad', color: '#EF4444', description: null };

      createComponent();
      component['openCreateModal']();

      expect(dialog.open).toHaveBeenCalledWith(TagFormModalComponent, {
        width: '420px',
        disableClose: true,
        data: null
      });
      expect(state.createTag).toHaveBeenCalledWith({ name: 'Navidad', color: '#EF4444', description: null });
    });

    it('should not create anything when the modal is dismissed', () => {
      dialogResult = null;

      createComponent();
      component['openCreateModal']();

      expect(state.createTag).not.toHaveBeenCalled();
    });
  });

  describe('edit modal', () => {
    it('should open the form modal with the tag and update it with the result', () => {
      dialogResult = { name: 'Viaje 2027', color: '#3B82F6', description: null };

      createComponent();
      component['openEditModal'](viajeTag);

      expect(dialog.open).toHaveBeenCalledWith(TagFormModalComponent, {
        width: '420px',
        disableClose: true,
        data: viajeTag
      });
      expect(state.updateTag).toHaveBeenCalledWith(1, { name: 'Viaje 2027', color: '#3B82F6', description: null });
    });

    it('should not update anything when the modal is dismissed', () => {
      dialogResult = null;

      createComponent();
      component['openEditModal'](viajeTag);

      expect(state.updateTag).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should confirm in Spanish with the tag name and delete on accept', () => {
      createComponent();

      component['deleteTag'](viajeTag);

      expect(confirmSpy).toHaveBeenCalledWith('¿Estás seguro de eliminar la etiqueta "Viaje"?');
      expect(state.deleteTag).toHaveBeenCalledWith(1);
    });

    it('should not delete when the confirm is rejected', () => {
      confirmSpy.mockReturnValue(false);

      createComponent();
      component['deleteTag'](viajeTag);

      expect(state.deleteTag).not.toHaveBeenCalled();
    });
  });
});
