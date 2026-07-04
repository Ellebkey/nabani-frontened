import { PaginationService } from './pagination.service';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(() => {
    service = new PaginationService();
  });

  it('should return the default pagination with the search input hidden', () => {
    expect(service.getDefaultPagination()).toEqual({
      limit: 25,
      offset: 0,
      searchText: null,
      count: 0,
      showInputSearch: false
    });
  });

  it('should enable the search input when requested', () => {
    expect(service.getDefaultPagination(true)).toEqual({
      limit: 25,
      offset: 0,
      searchText: null,
      count: 0,
      showInputSearch: true
    });
  });

  it('should return a fresh object on every call so callers can mutate safely', () => {
    const first = service.getDefaultPagination();
    const second = service.getDefaultPagination();

    expect(first).not.toBe(second);

    first.offset = 50;
    first.searchText = 'cafe';

    expect(second.offset).toBe(0);
    expect(second.searchText).toBeNull();
  });
});
