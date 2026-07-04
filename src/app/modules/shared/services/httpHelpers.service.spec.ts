import { HttpHelpersService } from './httpHelpers.service';

class TestHelpersService extends HttpHelpersService {
  buildParams(query: Record<string, unknown>): string {
    return this.createHttpParams(query as never).toString();
  }

  get apiUrl(): string {
    return this.API_URL;
  }
}

describe('HttpHelpersService', () => {
  let service: TestHelpersService;

  beforeEach(() => {
    service = new TestHelpersService();
  });

  it('should expose the environment API url', () => {
    expect(service.apiUrl).toContain('/api');
  });

  it('should append defined params', () => {
    const result = service.buildParams({ limit: 25, offset: 0, searchText: 'cafe' });

    expect(result).toContain('limit=25');
    expect(result).toContain('offset=0');
    expect(result).toContain('searchText=cafe');
  });

  it('should skip null, undefined and empty-string params', () => {
    const result = service.buildParams({
      limit: 10,
      searchText: '',
      categoryId: null,
      startDate: undefined
    });

    expect(result).toBe('limit=10');
  });

  it('should keep zero and false values', () => {
    const result = service.buildParams({ offset: 0, fetchAll: false });

    expect(result).toContain('offset=0');
    expect(result).toContain('fetchAll=false');
  });
});
