import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { ThemeService } from 'app/core/theme/theme.service';

import { UserComponent } from './user.component';

describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>;
  let component: UserComponent;
  let auth: { getFullname: jest.Mock; getUsername: jest.Mock; getUserRoles: jest.Mock; logout: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    auth = {
      getFullname: jest.fn().mockReturnValue(null),
      getUsername: jest.fn().mockReturnValue('joel'),
      getUserRoles: jest.fn().mockReturnValue(['admin']),
      logout: jest.fn()
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      // MatIconTestingModule serves blank icons for the unregistered heroicons set
      imports: [UserComponent, MatIconTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: auth },
        { provide: ThemeService, useValue: { scheme: () => 'light', setScheme: jest.fn(), resolvedScheme: () => 'light', init: jest.fn(), toggle: jest.fn() } },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should expose the username from the auth service', () => {
    expect(auth.getUsername).toHaveBeenCalledTimes(1);
    expect(component.username).toBe('joel');
  });

  it('should navigate to the profile page on viewProfile', () => {
    component.viewProfile();

    expect(router.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('should delegate sign out to the auth service', () => {
    component.signOut();

    expect(auth.logout).toHaveBeenCalledTimes(1);
  });
});
