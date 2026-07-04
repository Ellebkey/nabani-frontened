import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
  signal,
  output
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-camera-capture',
    templateUrl: './camera-capture.component.html',
    styleUrl: './camera-capture.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
]
})
export class CameraCaptureComponent implements OnDestroy {
  readonly photoCapture = output<File>();
  readonly cancelled = output<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected readonly isCameraActive = signal(false);
  protected readonly capturedImage = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private stream: MediaStream | null = null;

  // The captured/uploaded image awaiting the user's confirmation before scanning.
  private pendingFile: File | null = null;

  private fromCamera = false;

  async startCamera(): Promise<void> {
    console.log('startCamera called');
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      // Check if mediaDevices API is available (requires HTTPS on mobile)
      if (!navigator.mediaDevices?.getUserMedia) {
        const isSecureContext = window.isSecureContext;
        console.warn('mediaDevices not available. isSecureContext:', isSecureContext);
        this.errorMessage.set(
          isSecureContext
            ? 'Tu navegador no soporta acceso a la cámara. Intenta subir una imagen.'
            : 'Se requiere HTTPS para acceder a la cámara. Intenta subir una imagen.'
        );
        return;
      }

      console.log('Requesting camera access...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      console.log('Camera stream obtained');

      // Set camera active first so the video element renders
      this.isCameraActive.set(true);

      // Wait for next tick so Angular renders the video element
      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          console.log('Camera active, stream assigned');
        } else {
          console.warn('videoElement still not available');
          this.errorMessage.set('Error al inicializar la cámara. Intenta subir una imagen.');
          this.isCameraActive.set(false);
        }
      }, 0);
    } catch (error: unknown) {
      const err = error as { name?: string };
      console.error('Error de acceso a cámara:', error);
      this.errorMessage.set(
        err.name === 'NotAllowedError'
          ? 'Acceso a cámara denegado. Por favor habilita los permisos de cámara.'
          : 'No se pudo acceder a la cámara. Intenta subir una imagen.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  capturePhoto(): void {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0);
      this.capturedImage.set(canvas.toDataURL('image/jpeg', 0.9));
      canvas.toBlob(
        (blob) => {
          if (blob) {
            this.pendingFile = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
          }
        },
        'image/jpeg',
        0.9,
      );
    }

    this.fromCamera = true;
    this.stopCamera();
  }

  retakePhoto(): void {
    this.capturedImage.set(null);
    this.pendingFile = null;
    if (this.fromCamera) {
      this.startCamera();
    }
  }

  confirmPhoto(): void {
    if (this.pendingFile) {
      this.photoCapture.emit(this.pendingFile);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.compressImage(file);
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.compressImage(file);
    }
  }

  private compressImage(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 1920;

        let { width, height } = img;

        // Scale down if larger than max dimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          this.capturedImage.set(canvas.toDataURL('image/jpeg', 0.85));

          canvas.toBlob(
            (blob) => {
              if (blob) {
                this.pendingFile = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
              }
            },
            'image/jpeg',
            0.85
          );
        }

        this.fromCamera = false;
        this.stopCamera();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement?.click();
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.isCameraActive.set(false);
  }

  cancel(): void {
    this.stopCamera();
    this.capturedImage.set(null);
    this.pendingFile = null;
    this.cancelled.emit();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
