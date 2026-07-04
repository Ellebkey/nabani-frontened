import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

import { TagsStateService } from './tags-state.service';
import { TagsApiService } from '../api/tags-api.service';
import { ITag } from '@shared/interfaces/tag.model';

describe('TagsStateService', () => {
  let service: TagsStateService;
  let api: {
    getTags: jest.Mock;
    createTag: jest.Mock;
    updateTag: jest.Mock;
    deleteTag: jest.Mock;
  };
  let toast: { success: jest.Mock; error: jest.Mock };

  const makeTag = (overrides: Partial<ITag> = {}): ITag => ({
    id: 1,
    name: 'Vacaciones',
    color: '#3b82f6',
    ...overrides
  });

  const seedTags = (tags: ITag[], count = tags.length): void => {
    api.getTags.mockReturnValue(of({ rows: tags, count }));
    service.loadTags();
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    api = {
      getTags: jest.fn(),
      createTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn()
    };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        TagsStateService,
        { provide: TagsApiService, useValue: api },
        { provide: HotToastService, useValue: toast }
      ]
    });

    service = TestBed.inject(TagsStateService);
  });

  describe('loadTags', () => {
    it('should request with pagination (searchText undefined when null) and set rows + count', () => {
      const tags = [makeTag(), makeTag({ id: 2, name: 'Regalos' })];
      seedTags(tags, 8);

      expect(api.getTags).toHaveBeenCalledWith({ limit: 25, offset: 0, searchText: undefined });
      expect(service.tags()).toEqual(tags);
      expect(service.pagination().count).toBe(8);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should toast in Spanish, set error and keep state intact on failure', () => {
      api.getTags.mockReturnValue(throwError(() => new Error('boom')));

      service.loadTags();

      expect(toast.error).toHaveBeenCalledWith('Error al cargar las etiquetas');
      expect(service.error()).toBe('Error al cargar las etiquetas');
      expect(service.tags()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('createTag', () => {
    it('should only append AFTER the api resolves and bump the count (signal golden rule)', () => {
      seedTags([makeTag()], 1);
      const response$ = new Subject<ITag>();
      api.createTag.mockReturnValue(response$.asObservable());
      const emitted: ITag[] = [];
      service.tagCreated.subscribe(t => emitted.push(t));

      service.createTag({ name: 'Regalos', color: '#ef4444' });

      // server has not responded yet: nothing appended, count untouched
      expect(service.tags()).toHaveLength(1);
      expect(service.pagination().count).toBe(1);
      expect(service.loading()).toBe(true);
      expect(emitted).toHaveLength(0);

      const created = makeTag({ id: 2, name: 'Regalos', color: '#ef4444' });
      response$.next(created);
      response$.complete();

      expect(service.tags()).toEqual([makeTag(), created]);
      expect(service.pagination().count).toBe(2); // count bookkeeping
      expect(emitted).toEqual([created]);
      expect(toast.success).toHaveBeenCalledWith('Etiqueta creada exitosamente');
      expect(service.loading()).toBe(false);
    });

    it('should toast and leave list + count intact on failure', () => {
      seedTags([makeTag()], 1);
      api.createTag.mockReturnValue(throwError(() => new Error('boom')));

      service.createTag({ name: 'Regalos', color: '#ef4444' });

      expect(toast.error).toHaveBeenCalledWith('Error al crear la etiqueta');
      expect(service.error()).toBe('Error al crear la etiqueta');
      expect(service.tags()).toHaveLength(1);
      expect(service.pagination().count).toBe(1);
    });
  });

  describe('updateTag', () => {
    it('should replace the tag, emit and toast after the server responds', () => {
      const t1 = makeTag();
      const t2 = makeTag({ id: 2, name: 'Regalos' });
      seedTags([t1, t2]);

      const updated = makeTag({ name: 'Viaje CDMX' });
      const emitted: ITag[] = [];
      service.tagUpdated.subscribe(t => emitted.push(t));
      api.updateTag.mockReturnValue(of(updated));

      service.updateTag(1, { name: 'Viaje CDMX' });

      expect(api.updateTag).toHaveBeenCalledWith(1, { name: 'Viaje CDMX' });
      expect(service.tags()).toEqual([updated, t2]);
      expect(emitted).toEqual([updated]);
      expect(toast.success).toHaveBeenCalledWith('Etiqueta actualizada exitosamente');
    });

    it('should sync the selected tag only when it matches the updated id', () => {
      const t1 = makeTag();
      const t2 = makeTag({ id: 2, name: 'Regalos' });
      seedTags([t1, t2]);
      service.selectTag(t1);

      const updated = makeTag({ name: 'Viaje CDMX' });
      api.updateTag.mockReturnValue(of(updated));
      service.updateTag(1, { name: 'Viaje CDMX' });

      expect(service.selectedTag()).toEqual(updated);

      api.updateTag.mockReturnValue(of(makeTag({ id: 2, name: 'Cumpleaños' })));
      service.updateTag(2, { name: 'Cumpleaños' });

      expect(service.selectedTag()).toEqual(updated); // selection (id 1) untouched
    });

    it('should toast and leave the tag intact on failure', () => {
      const t1 = makeTag();
      seedTags([t1]);
      api.updateTag.mockReturnValue(throwError(() => new Error('boom')));

      service.updateTag(1, { name: 'X' });

      expect(toast.error).toHaveBeenCalledWith('Error al actualizar la etiqueta');
      expect(service.error()).toBe('Error al actualizar la etiqueta');
      expect(service.tags()).toEqual([t1]);
    });
  });

  describe('deleteTag', () => {
    it('should remove the tag, decrement the count, clear selection and emit the id', () => {
      const t1 = makeTag();
      const t2 = makeTag({ id: 2, name: 'Regalos' });
      seedTags([t1, t2], 2);
      service.selectTag(t1);

      const deletedIds: number[] = [];
      service.tagDeleted.subscribe(id => deletedIds.push(id));
      api.deleteTag.mockReturnValue(of(void 0));

      service.deleteTag(1);

      expect(api.deleteTag).toHaveBeenCalledWith(1);
      expect(service.tags()).toEqual([t2]);
      expect(service.pagination().count).toBe(1); // count bookkeeping
      expect(service.selectedTag()).toBeNull();
      expect(deletedIds).toEqual([1]);
      expect(toast.success).toHaveBeenCalledWith('Etiqueta eliminada exitosamente');
    });

    it('should keep a non-matching selection and floor the count at zero', () => {
      const t1 = makeTag();
      const t2 = makeTag({ id: 2, name: 'Regalos' });
      seedTags([t1, t2], 0); // backend count already at 0
      service.selectTag(t2);
      api.deleteTag.mockReturnValue(of(void 0));

      service.deleteTag(1);

      expect(service.pagination().count).toBe(0);
      expect(service.selectedTag()).toEqual(t2);
    });

    it('should not remove anything until the server confirms (signal golden rule)', () => {
      seedTags([makeTag()], 1);
      const response$ = new Subject<void>();
      api.deleteTag.mockReturnValue(response$.asObservable());

      service.deleteTag(1);

      expect(service.tags()).toHaveLength(1);
      expect(service.loading()).toBe(true);

      response$.next();
      response$.complete();

      expect(service.tags()).toHaveLength(0);
      expect(service.loading()).toBe(false);
    });

    it('should toast and keep the tag on failure', () => {
      const t1 = makeTag();
      seedTags([t1], 1);
      api.deleteTag.mockReturnValue(throwError(() => new Error('boom')));

      service.deleteTag(1);

      expect(toast.error).toHaveBeenCalledWith('Error al eliminar la etiqueta');
      expect(service.error()).toBe('Error al eliminar la etiqueta');
      expect(service.tags()).toEqual([t1]);
      expect(service.pagination().count).toBe(1);
    });
  });

  describe('updatePagination', () => {
    it('should merge the partial settings and reload forwarding the searchText', () => {
      api.getTags.mockReturnValue(of({ rows: [], count: 0 }));

      service.updatePagination({ offset: 25, searchText: 'viaje' });

      expect(service.pagination().offset).toBe(25);
      expect(api.getTags).toHaveBeenCalledWith({ limit: 25, offset: 25, searchText: 'viaje' });
    });
  });

  describe('computed signals', () => {
    it('should filter tags by the search query (case-insensitive)', () => {
      seedTags([makeTag(), makeTag({ id: 2, name: 'Regalos' })]);

      service.setSearchQuery('REGA');

      expect(service.searchQuery()).toBe('REGA');
      expect(service.filteredTags()).toHaveLength(1);
      expect(service.filteredTags()[0].name).toBe('Regalos');

      service.setSearchQuery('');
      expect(service.filteredTags()).toHaveLength(2);
    });

    it('should derive count, hasTags, isEmpty and isSuccess', () => {
      expect(service.isEmpty()).toBe(true);
      expect(service.isSuccess()).toBe(false);

      seedTags([makeTag()]);

      expect(service.tagCount()).toBe(1);
      expect(service.hasTags()).toBe(true);
      expect(service.isEmpty()).toBe(false);
      expect(service.isSuccess()).toBe(true);
    });
  });

  describe('state helpers', () => {
    it('should clear errors', () => {
      api.getTags.mockReturnValue(throwError(() => new Error('boom')));
      service.loadTags();
      expect(service.error()).not.toBeNull();

      service.clearError();

      expect(service.error()).toBeNull();
    });

    it('should reset every signal to its initial value', () => {
      seedTags([makeTag()], 4);
      service.selectTag(makeTag());
      service.setSearchQuery('viaje');

      service.resetState();

      expect(service.tags()).toEqual([]);
      expect(service.selectedTag()).toBeNull();
      expect(service.searchQuery()).toBe('');
      expect(service.error()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(service.pagination()).toEqual({
        limit: 25,
        offset: 0,
        searchText: null,
        count: 0,
        showInputSearch: true
      });
    });
  });
});
