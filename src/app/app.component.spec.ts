import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { TitleService } from './core/title.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let titleService: { init: jest.Mock };

  beforeEach(() => {
    titleService = { init: jest.fn() };

    TestBed.configureTestingModule({
    imports: [AppComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [{ provide: TitleService, useValue: titleService }]
});

    fixture = TestBed.createComponent(AppComponent);
  });

  it('should create the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize the title service on init', () => {
    fixture.detectChanges();

    expect(titleService.init).toHaveBeenCalledTimes(1);
  });

  it('should render only a router outlet', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
