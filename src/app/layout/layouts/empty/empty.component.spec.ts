import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { EmptyLayoutComponent } from './empty.component';

describe('EmptyLayoutComponent', () => {
  let fixture: ComponentFixture<EmptyLayoutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // HttpClientTestingModule backs the MagueyLoadingService injected by the loading bar
      imports: [EmptyLayoutComponent, HttpClientTestingModule],
      providers: [provideRouter([]), provideNoopAnimations()]
    });

    fixture = TestBed.createComponent(EmptyLayoutComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the loading bar and the router outlet', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('mg-loading-bar')).not.toBeNull();
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

});
