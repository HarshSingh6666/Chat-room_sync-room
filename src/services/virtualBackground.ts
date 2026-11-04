/**
 * Virtual Background & Blur Canvas Processor
 * Applies real-time canvas-based background blur or virtual backdrops to the local WebRTC video stream.
 */

export type BackgroundEffect =
  | 'none'
  | 'blur-light'
  | 'blur-heavy'
  | 'office'
  | 'cyberpunk'
  | 'sunset'
  | 'studio';

export interface BackgroundOption {
  id: BackgroundEffect;
  name: string;
  description: string;
  previewColor: string;
  iconType: 'none' | 'blur' | 'image' | 'gradient';
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'none',
    name: 'Normal',
    description: 'Original camera feed',
    previewColor: '#334155',
    iconType: 'none',
  },
  {
    id: 'blur-light',
    name: 'Portrait Blur',
    description: 'Subtle DSLR bokeh depth effect',
    previewColor: '#6366f1',
    iconType: 'blur',
  },
  {
    id: 'blur-heavy',
    name: 'Privacy Blur',
    description: 'Strong background privacy blur',
    previewColor: '#4f46e5',
    iconType: 'blur',
  },
  {
    id: 'office',
    name: 'Executive Office',
    description: 'Modern minimalist loft office',
    previewColor: '#0f172a',
    iconType: 'image',
  },
  {
    id: 'cyberpunk',
    name: 'Neon Studio',
    description: 'Futuristic purple & cyan studio',
    previewColor: '#581c87',
    iconType: 'image',
  },
  {
    id: 'sunset',
    name: 'Golden Hour',
    description: 'Warm sunset ambient lighting',
    previewColor: '#c2410c',
    iconType: 'gradient',
  },
  {
    id: 'studio',
    name: 'Mesh Gradient',
    description: 'Clean modern tech studio backdrop',
    previewColor: '#1e1b4b',
    iconType: 'gradient',
  },
];

export class VirtualBackgroundProcessor {
  private sourceStream: MediaStream;
  private videoElement: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private outputStream: MediaStream;
  private currentEffect: BackgroundEffect = 'none';
  private animationFrameId: number | null = null;
  private isDestroyed: boolean = false;

  constructor(sourceStream: MediaStream) {
    this.sourceStream = sourceStream;

    // Offscreen reader video
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    this.videoElement.srcObject = sourceStream;

    // Offscreen processing canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;

    // Ensure video is playing
    this.videoElement.play().catch(() => {});

    // Output capture stream
    const canvasStream = this.canvas.captureStream(30);

    // Merge audio tracks from original stream
    this.outputStream = new MediaStream();
    const canvasVideoTrack = canvasStream.getVideoTracks()[0];
    if (canvasVideoTrack) {
      this.outputStream.addTrack(canvasVideoTrack);
    }
    sourceStream.getAudioTracks().forEach((audioTrack) => {
      this.outputStream.addTrack(audioTrack);
    });

    this.startRendering();
  }

  getOutputStream(): MediaStream {
    return this.outputStream;
  }

  getVideoTrack(): MediaStreamTrack | null {
    return this.outputStream.getVideoTracks()[0] || null;
  }

  getEffect(): BackgroundEffect {
    return this.currentEffect;
  }

  setEffect(effect: BackgroundEffect) {
    this.currentEffect = effect;
  }

  private startRendering() {
    let t = 0;

    const render = () => {
      if (this.isDestroyed) return;
      t += 0.03;

      const w = this.canvas.width;
      const h = this.canvas.height;
      const ctx = this.ctx;

      // Update canvas dimensions if video resolution is available
      if (
        this.videoElement.videoWidth &&
        this.videoElement.videoWidth !== this.canvas.width
      ) {
        this.canvas.width = this.videoElement.videoWidth;
        this.canvas.height = this.videoElement.videoHeight;
      }

      if (this.currentEffect === 'none') {
        // Skip drawing entirely to save CPU when effect is none
        // The UI should switch to using the raw camera stream instead
      } else if (
        this.currentEffect === 'blur-light' ||
        this.currentEffect === 'blur-heavy'
      ) {
        // --- PORTRAIT BOKEH / PRIVACY BLUR ---
        const blurAmount = this.currentEffect === 'blur-light' ? '12px' : '26px';

        // 1. Draw blurred background covering entire frame
        ctx.save();
        ctx.filter = `blur(${blurAmount}) brightness(0.92)`;
        ctx.drawImage(this.videoElement, 0, 0, w, h);
        ctx.restore();

        // 2. Draw sharp central subject using soft-feathered portrait vignette mask
        ctx.save();
        ctx.beginPath();
        // Elliptical portrait mask (center-weighted where user is positioned)
        const cx = w / 2;
        const cy = h / 2 + 10;
        const rx = w * 0.32;
        const ry = h * 0.45;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.clip();

        // Draw crisp unblurred video inside portrait mask
        ctx.filter = 'none';
        ctx.drawImage(this.videoElement, 0, 0, w, h);
        ctx.restore();

        // 3. Smooth blend transition feather ring
        const grad = ctx.createRadialGradient(
          cx,
          cy,
          rx * 0.65,
          cx,
          cy,
          rx * 1.15
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(15,23,42,0.35)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        // --- VIRTUAL BACKGROUNDS ---
        // 1. Render virtual background backdrop
        this.drawBackdrop(ctx, w, h, this.currentEffect, t);

        // 2. Render user foreground with portrait cutout blending
        ctx.save();
        const cx = w / 2;
        const cy = h / 2 + 15;
        const rx = w * 0.33;
        const ry = h * 0.46;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.clip();

        // Draw video feed with subtle enhancement
        ctx.filter = 'contrast(1.04) brightness(1.02)';
        ctx.drawImage(this.videoElement, 0, 0, w, h);
        ctx.restore();

        // 3. Ambient rim lighting overlay to naturally integrate the subject into backdrop
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        const rim = ctx.createRadialGradient(cx, cy, rx * 0.8, cx, cy, rx * 1.25);
        if (this.currentEffect === 'cyberpunk') {
          rim.addColorStop(0, 'transparent');
          rim.addColorStop(1, 'rgba(236,72,153,0.4)');
        } else if (this.currentEffect === 'sunset') {
          rim.addColorStop(0, 'transparent');
          rim.addColorStop(1, 'rgba(251,146,60,0.4)');
        } else {
          rim.addColorStop(0, 'transparent');
          rim.addColorStop(1, 'rgba(99,102,241,0.3)');
        }
        ctx.fillStyle = rim;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  private drawBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    effect: BackgroundEffect,
    t: number
  ) {
    if (effect === 'office') {
      // Modern executive loft office
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(0.5, '#1e293b');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Bookshelf / Window frame simulation
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fillRect(30, 40, w * 0.28, h * 0.75);

      // Warm interior ambient light glow
      const lamp = ctx.createRadialGradient(w * 0.85, 90, 10, w * 0.85, 90, 220);
      lamp.addColorStop(0, 'rgba(253, 224, 71, 0.25)');
      lamp.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lamp;
      ctx.fillRect(0, 0, w, h);

      // Office wall acoustic slats
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 3;
      for (let x = w * 0.65; x < w - 20; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, h - 40);
        ctx.stroke();
      }
    } else if (effect === 'cyberpunk') {
      // Neon night studio
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#090514');
      bg.addColorStop(0.5, '#2e1065');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Neon purple and teal light tubes
      const neon1 = ctx.createRadialGradient(
        w * 0.15,
        h * 0.3,
        20,
        w * 0.15,
        h * 0.3,
        260
      );
      neon1.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
      neon1.addColorStop(1, 'transparent');
      ctx.fillStyle = neon1;
      ctx.fillRect(0, 0, w, h);

      const neon2 = ctx.createRadialGradient(
        w * 0.85,
        h * 0.7,
        20,
        w * 0.85,
        h * 0.7,
        260
      );
      neon2.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      neon2.addColorStop(1, 'transparent');
      ctx.fillStyle = neon2;
      ctx.fillRect(0, 0, w, h);

      // Perspective grid floor
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.65);
        ctx.lineTo(w / 2 + (x - w / 2) * 1.8, h);
        ctx.stroke();
      }
    } else if (effect === 'sunset') {
      // Golden hour sunset glow
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#1e1b4b');
      bg.addColorStop(0.35, '#581c87');
      bg.addColorStop(0.65, '#c2410c');
      bg.addColorStop(1, '#ea580c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Sun orb with soft glow
      const sun = ctx.createRadialGradient(
        w * 0.75,
        h * 0.45,
        15,
        w * 0.75,
        h * 0.45,
        160
      );
      sun.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
      sun.addColorStop(0.3, 'rgba(251, 146, 60, 0.6)');
      sun.addColorStop(1, 'transparent');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.45, 160, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Studio mesh gradient
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#1e1b4b');
      bg.addColorStop(0.5, '#312e81');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Pulsing ambient lights
      const orb = ctx.createRadialGradient(
        w * 0.25 + Math.sin(t) * 30,
        h * 0.35 + Math.cos(t) * 20,
        20,
        w * 0.25,
        h * 0.35,
        240
      );
      orb.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
      orb.addColorStop(1, 'transparent');
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, w, h);
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.videoElement.pause();
    this.videoElement.srcObject = null;
    this.outputStream.getTracks().forEach((t) => t.stop());
  }
}
