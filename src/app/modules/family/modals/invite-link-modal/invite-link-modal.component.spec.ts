import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HotToastService } from '@ngxpert/hot-toast';

import { InviteLinkModalComponent } from './invite-link-modal.component';

describe('InviteLinkModalComponent', () => {
  let fixture: ComponentFixture<InviteLinkModalComponent>;
  let component: InviteLinkModalComponent;
  let dialogRef: { close: jest.Mock };
  let toast: { success: jest.Mock; error: jest.Mock };
  let writeText: jest.Mock;

  const data = { token: 'tok-secret-123', email: 'pareja@test.com' };
  const expectedLink = `${window.location.origin}/#/family/accept?token=tok-secret-123`;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    dialogRef = { close: jest.fn() };
    toast = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [InviteLinkModalComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: HotToastService, useValue: toast },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    fixture = TestBed.createComponent(InviteLinkModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('invite link composition', () => {
    it('should build a hash-route accept link containing the token', () => {
      expect(component['inviteLink']).toBe(expectedLink);
      expect(component['inviteLink']).toContain('/#/family/accept?token=');
    });

    it('should render the invitee email, the link and the expiry warning', () => {
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(text).toContain('Invitación creada');
      expect(text).toContain('pareja@test.com');
      expect(text).toContain(expectedLink);
      expect(text).toContain('Expira en 7 días');
    });
  });

  describe('copyLink', () => {
    it('should copy the link to the clipboard, toast and flag copied', fakeAsync(() => {
      component['copyLink']();
      flushMicrotasks();

      expect(writeText).toHaveBeenCalledWith(expectedLink);
      expect(component['copied']()).toBe(true);
      expect(toast.success).toHaveBeenCalledWith('Enlace copiado al portapapeles');
    }));

    it('should not flag copied before the clipboard write resolves', () => {
      let resolveWrite!: () => void;
      writeText.mockReturnValue(new Promise<void>(resolve => (resolveWrite = resolve)));

      component['copyLink']();

      expect(component['copied']()).toBe(false);
      expect(toast.success).not.toHaveBeenCalled();
      resolveWrite();
    });
  });

  it('should close the dialog from the header button', () => {
    component['closeDialog']();

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
  });
});
