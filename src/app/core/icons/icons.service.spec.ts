import { TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

import { IconsService } from './icons.service';

describe('IconsService', () => {
  let registry: { addSvgIconSet: jest.Mock; addSvgIconSetInNamespace: jest.Mock };
  let sanitizer: { bypassSecurityTrustResourceUrl: jest.Mock };

  beforeEach(() => {
    registry = { addSvgIconSet: jest.fn(), addSvgIconSetInNamespace: jest.fn() };
    sanitizer = { bypassSecurityTrustResourceUrl: jest.fn((url: string) => `safe:${url}`) };

    TestBed.configureTestingModule({
      providers: [
        IconsService,
        { provide: MatIconRegistry, useValue: registry },
        { provide: DomSanitizer, useValue: sanitizer }
      ]
    });
  });

  const create = (): IconsService => TestBed.inject(IconsService);

  it('should register only the heroicons sets with their sanitized asset urls', () => {
    create();

    expect(registry.addSvgIconSet).not.toHaveBeenCalled();
    expect(registry.addSvgIconSetInNamespace.mock.calls).toEqual([
      ['heroicons_outline', 'safe:assets/icons/heroicons-outline.svg'],
      ['heroicons_solid', 'safe:assets/icons/heroicons-solid.svg'],
    ]);
  });

  it('should sanitize every asset url through the DomSanitizer', () => {
    create();

    const sanitizedUrls = sanitizer.bypassSecurityTrustResourceUrl.mock.calls.map(([url]) => url);

    expect(sanitizedUrls).toEqual([
      'assets/icons/heroicons-outline.svg',
      'assets/icons/heroicons-solid.svg',
    ]);
  });
});
