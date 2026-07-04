import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraCaptureComponent } from './camera-capture.component';

describe('CameraCaptureComponent', () => {
  let fixture: ComponentFixture<CameraCaptureComponent>;
  let component: CameraCaptureComponent;
  let getUserMedia: jest.Mock;
  let track: { stop: jest.Mock };
  let stream: MediaStream;

  const makeCanvas = (quality: { dataUrl: string }) => {
    const context = { drawImage: jest.fn() };
    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => context),
      toDataURL: jest.fn(() => quality.dataUrl),
      toBlob: jest.fn((callback: (blob: Blob | null) => void) => callback(new Blob(['img'], { type: 'image/jpeg' })))
    };
    return { canvas, context };
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    track = { stop: jest.fn() };
    stream = { getTracks: () => [track] } as unknown as MediaStream;
    getUserMedia = jest.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia }
    });

    TestBed.configureTestingModule({ imports: [CameraCaptureComponent] });
    TestBed.overrideComponent(CameraCaptureComponent, { set: { template: '', imports: [] } });

    fixture = TestBed.createComponent(CameraCaptureComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (navigator as { mediaDevices?: unknown }).mediaDevices;
    delete (window as { isSecureContext?: unknown }).isSecureContext;
    jest.restoreAllMocks();
  });

  describe('startCamera', () => {
    it('should request the rear camera and attach the stream to the video element', async () => {
      jest.useFakeTimers();
      getUserMedia.mockResolvedValue(stream);
      const video = { srcObject: null } as unknown as HTMLVideoElement;
      component.videoElement = { nativeElement: video } as CameraCaptureComponent['videoElement'];

      await component.startCamera();

      expect(getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      expect(component['isCameraActive']()).toBe(true);
      expect(component['isLoading']()).toBe(false);
      expect(component['errorMessage']()).toBeNull();

      jest.advanceTimersByTime(0);
      expect(video.srcObject).toBe(stream);
    });

    it('should fail in Spanish and deactivate when the video element never renders', async () => {
      jest.useFakeTimers();
      getUserMedia.mockResolvedValue(stream);

      await component.startCamera();
      jest.advanceTimersByTime(0);

      expect(component['errorMessage']()).toBe('Error al inicializar la cámara. Intenta subir una imagen.');
      expect(component['isCameraActive']()).toBe(false);
    });

    it('should explain a denied permission', async () => {
      getUserMedia.mockRejectedValue({ name: 'NotAllowedError' });

      await component.startCamera();

      expect(component['errorMessage']()).toBe('Acceso a cámara denegado. Por favor habilita los permisos de cámara.');
      expect(component['isCameraActive']()).toBe(false);
      expect(component['isLoading']()).toBe(false);
    });

    it('should fall back to a generic camera error for other failures', async () => {
      getUserMedia.mockRejectedValue({ name: 'NotFoundError' });

      await component.startCamera();

      expect(component['errorMessage']()).toBe('No se pudo acceder a la cámara. Intenta subir una imagen.');
    });

    it('should suggest uploading when mediaDevices is missing in a secure context', async () => {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
      Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });

      await component.startCamera();

      expect(component['errorMessage']()).toBe('Tu navegador no soporta acceso a la cámara. Intenta subir una imagen.');
      expect(component['isLoading']()).toBe(false);
    });

    it('should ask for HTTPS when mediaDevices is missing in an insecure context', async () => {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
      Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });

      await component.startCamera();

      expect(component['errorMessage']()).toBe('Se requiere HTTPS para acceder a la cámara. Intenta subir una imagen.');
    });
  });

  describe('capturePhoto', () => {
    function captureWithFakes(): { canvas: ReturnType<typeof makeCanvas>['canvas']; context: { drawImage: jest.Mock } } {
      const { canvas, context } = makeCanvas({ dataUrl: 'data:image/jpeg;base64,FOTO' });
      const video = { videoWidth: 640, videoHeight: 480 };
      component.videoElement = { nativeElement: video } as unknown as CameraCaptureComponent['videoElement'];
      component.canvasElement = { nativeElement: canvas } as unknown as CameraCaptureComponent['canvasElement'];
      (component as unknown as { stream: MediaStream | null }).stream = stream;
      component['isCameraActive'].set(true);

      component.capturePhoto();
      return { canvas, context };
    }

    it('should do nothing when the video or canvas refs are missing', () => {
      component.capturePhoto();

      expect(component['capturedImage']()).toBeNull();
    });

    it('should draw the frame, keep the jpeg preview and stop the camera', () => {
      const { canvas, context } = captureWithFakes();

      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(480);
      expect(context.drawImage).toHaveBeenCalledWith(component.videoElement.nativeElement, 0, 0);
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
      expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9);
      expect(component['capturedImage']()).toBe('data:image/jpeg;base64,FOTO');
      expect(track.stop).toHaveBeenCalled();
      expect(component['isCameraActive']()).toBe(false);
    });

    it('should emit the captured file only once confirmed', () => {
      const emitted: File[] = [];
      component.photoCapture.subscribe((file) => emitted.push(file));

      component.confirmPhoto();
      expect(emitted).toHaveLength(0);

      captureWithFakes();
      component.confirmPhoto();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].name).toBe('receipt.jpg');
      expect(emitted[0].type).toBe('image/jpeg');
    });

    it('should restart the camera on retake after a camera capture', () => {
      captureWithFakes();
      const startSpy = jest.spyOn(component, 'startCamera').mockResolvedValue(undefined);

      component.retakePhoto();

      expect(component['capturedImage']()).toBeNull();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should not restart the camera on retake when nothing came from it', () => {
      const startSpy = jest.spyOn(component, 'startCamera').mockResolvedValue(undefined);

      component.retakePhoto();

      expect(startSpy).not.toHaveBeenCalled();
    });
  });

  describe('file upload', () => {
    it('should compress the selected file and clear the input value', () => {
      const compressSpy = jest
        .spyOn(component as unknown as { compressImage: (file: File) => void }, 'compressImage')
        .mockImplementation(() => undefined);
      const file = new File(['x'], 'foto.png', { type: 'image/png' });
      const input = { files: [file], value: 'C:\\fakepath\\foto.png' } as unknown as HTMLInputElement;

      component.onFileSelected({ target: input } as unknown as Event);

      expect(compressSpy).toHaveBeenCalledWith(file);
      expect(input.value).toBe('');
    });

    it('should ignore a change event without files', () => {
      const compressSpy = jest
        .spyOn(component as unknown as { compressImage: (file: File) => void }, 'compressImage')
        .mockImplementation(() => undefined);

      component.onFileSelected({ target: { files: null, value: '' } } as unknown as Event);

      expect(compressSpy).not.toHaveBeenCalled();
    });

    describe('compressImage', () => {
      const originalImage = global.Image;
      const originalFileReader = global.FileReader;
      let imageSize: { width: number; height: number };

      beforeEach(() => {
        imageSize = { width: 2400, height: 1200 };

        class FakeFileReader {
          onload: ((event: unknown) => void) | null = null;
          readAsDataURL(): void {
            this.onload?.({ target: { result: 'data:image/png;base64,RAW' } });
          }
        }
        class FakeImage {
          onload: (() => void) | null = null;
          width = imageSize.width;
          height = imageSize.height;
          set src(_value: string) {
            this.onload?.();
          }
        }
        (global as { FileReader: unknown }).FileReader = FakeFileReader;
        (global as { Image: unknown }).Image = FakeImage;
      });

      afterEach(() => {
        global.Image = originalImage;
        global.FileReader = originalFileReader;
      });

      function runCompression(): ReturnType<typeof makeCanvas> {
        const fakes = makeCanvas({ dataUrl: 'data:image/jpeg;base64,COMPRESSED' });
        const realCreateElement = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) =>
          tagName === 'canvas' ? fakes.canvas : realCreateElement(tagName, options)) as typeof document.createElement);

        (component as unknown as { compressImage: (file: File) => void })
          .compressImage(new File(['x'], 'foto.png', { type: 'image/png' }));
        return fakes;
      }

      it('should scale a wide image down to 1920px and keep the compressed jpeg', () => {
        const { canvas, context } = runCompression();

        expect(canvas.width).toBe(1920);
        expect(canvas.height).toBe(960);
        expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1920, 960);
        expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85);
        expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85);
        expect(component['capturedImage']()).toBe('data:image/jpeg;base64,COMPRESSED');
      });

      it('should scale a tall image against its height', () => {
        imageSize = { width: 1000, height: 3840 };

        const { canvas } = runCompression();

        expect(canvas.width).toBeCloseTo(500, 6);
        expect(canvas.height).toBe(1920);
      });

      it('should keep small images at their original size and mark them as uploads', () => {
        imageSize = { width: 800, height: 600 };

        const { canvas } = runCompression();

        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);

        // An uploaded photo must not reopen the camera on retake.
        const startSpy = jest.spyOn(component, 'startCamera').mockResolvedValue(undefined);
        component.retakePhoto();
        expect(startSpy).not.toHaveBeenCalled();
      });

      it('should produce a confirmable receipt.jpg file', () => {
        const emitted: File[] = [];
        component.photoCapture.subscribe((file) => emitted.push(file));

        runCompression();
        component.confirmPhoto();

        expect(emitted).toHaveLength(1);
        expect(emitted[0].name).toBe('receipt.jpg');
      });
    });
  });

  describe('lifecycle and misc', () => {
    it('should forward openFilePicker to the hidden input', () => {
      const click = jest.fn();
      component.fileInput = { nativeElement: { click } } as unknown as CameraCaptureComponent['fileInput'];

      component.openFilePicker();

      expect(click).toHaveBeenCalled();
    });

    it('should not blow up when the file input is missing', () => {
      expect(() => component.openFilePicker()).not.toThrow();
    });

    it('should clear the error message', () => {
      component['errorMessage'].set('algo salió mal');

      component.clearError();

      expect(component['errorMessage']()).toBeNull();
    });

    it('should stop every track and reset state on cancel, then emit cancelled', () => {
      (component as unknown as { stream: MediaStream | null }).stream = stream;
      component['isCameraActive'].set(true);
      component['capturedImage'].set('data:image/jpeg;base64,FOTO');
      const cancelledSpy = jest.spyOn(component.cancelled, 'emit');

      component.cancel();

      expect(track.stop).toHaveBeenCalled();
      expect(component['isCameraActive']()).toBe(false);
      expect(component['capturedImage']()).toBeNull();
      expect(cancelledSpy).toHaveBeenCalled();
    });

    it('should release the camera on destroy', () => {
      (component as unknown as { stream: MediaStream | null }).stream = stream;

      component.ngOnDestroy();

      expect(track.stop).toHaveBeenCalled();
      expect(component['isCameraActive']()).toBe(false);
    });
  });
});
