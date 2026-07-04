import { TestBed } from '@angular/core/testing';
import { MagueyConfigService } from '@maguey/services/config';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let configService: { config: unknown };

  function setup(stored: string | null = null): ThemeService {
    localStorage.clear();
    if (stored !== null) {
      localStorage.setItem('scheme', stored);
    }
    configService = { config: undefined };
    TestBed.configureTestingModule({
      providers: [{ provide: MagueyConfigService, useValue: configService }],
    });
    return TestBed.inject(ThemeService);
  }

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('defaults to auto when nothing (or garbage) is stored', () => {
    expect(setup().scheme()).toBe('auto');
    TestBed.resetTestingModule();
    expect(setup('banana').scheme()).toBe('auto');
  });

  it('restores a persisted scheme and applies it on init', () => {
    const service = setup('dark');

    expect(service.scheme()).toBe('dark');

    service.init();
    expect(configService.config).toEqual({ scheme: 'dark' });
  });

  it('setScheme persists and pushes the scheme into the Maguey config', () => {
    const service = setup();

    service.setScheme('light');

    expect(localStorage.getItem('scheme')).toBe('light');
    expect(service.scheme()).toBe('light');
    expect(configService.config).toEqual({ scheme: 'light' });
  });

  it('resolves explicit schemes as themselves and auto against the media query', () => {
    const service = setup('dark');
    expect(service.resolvedScheme()).toBe('dark');

    service.setScheme('auto');
    const matchMediaSpy = jest.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(service.resolvedScheme()).toBe('dark');

    matchMediaSpy.mockReturnValue({ matches: false } as MediaQueryList);
    expect(service.resolvedScheme()).toBe('light');
    matchMediaSpy.mockRestore();
  });

  it('toggle flips against the resolved scheme', () => {
    const service = setup('dark');

    service.toggle();
    expect(service.scheme()).toBe('light');

    service.toggle();
    expect(service.scheme()).toBe('dark');
  });
});
