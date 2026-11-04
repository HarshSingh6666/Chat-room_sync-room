/**
 * WebRTC Service for peer-to-peer audio/video streaming & fallback stream generation
 */

export interface WebRTCCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

/**
 * Creates an animated canvas video stream + silent audio track
 * as a high-fidelity fallback when physical camera/mic is denied or unavailable.
 */
export function createSyntheticStream(label: string = 'SyncRoom User'): {
  stream: MediaStream;
  stop: () => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  let animationFrameId: number;
  let t = 0;

  const render = () => {
    t += 0.04;
    // Dark modern gradient background
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing animated circular waves
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 20;

    for (let r = 1; r <= 3; r++) {
      const radius = 60 + r * 28 + Math.sin(t + r) * 12;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(99, 102, 241, ${0.35 - r * 0.08})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Avatar orb
    const orbGrad = ctx.createRadialGradient(cx - 15, cy - 15, 10, cx, cy, 55);
    orbGrad.addColorStop(0, '#818cf8');
    orbGrad.addColorStop(1, '#4338ca');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fill();

    // Initials in avatar
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = label.slice(0, 2).toUpperCase() || 'SR';
    ctx.fillText(initials, cx, cy);

    // Dynamic waveform at bottom
    ctx.fillStyle = 'rgba(129, 140, 248, 0.7)';
    const barWidth = 6;
    const gap = 4;
    const numBars = 24;
    const startX = cx - (numBars * (barWidth + gap)) / 2;
    for (let i = 0; i < numBars; i++) {
      const h = Math.max(6, Math.sin(t * 2 + i * 0.4) * 22 + 20);
      const bx = startX + i * (barWidth + gap);
      const by = canvas.height - 70 - h / 2;
      ctx.fillRect(bx, by, barWidth, h);
    }

    // Label banner
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(`${label} (Virtual Avatar Feed)`, cx, canvas.height - 35);

    animationFrameId = requestAnimationFrame(render);
  };

  render();

  const canvasStream = canvas.captureStream(30);

  // Generate synthetic silent audio track
  let audioTrack: MediaStreamTrack | null = null;
  let audioCtx: AudioContext | null = null;
  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0; // Silent
      osc.connect(gain);
      const dest = audioCtx.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();
      audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    }
  } catch (err) {
    console.warn('AudioContext fallback creation skipped:', err);
  }

  const stop = () => {
    cancelAnimationFrame(animationFrameId);
    canvasStream.getTracks().forEach((track) => track.stop());
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  };

  return { stream: canvasStream, stop };
}

export class WebRTCConnection {
  pc: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream = new MediaStream();
  callbacks: WebRTCCallbacks;
  sendSignal: (signal: any) => void;
  isInitiator: boolean = false;
  pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(
    sendSignal: (signal: any) => void,
    callbacks: WebRTCCallbacks,
    isInitiator: boolean
  ) {
    this.sendSignal = sendSignal;
    this.callbacks = callbacks;
    this.isInitiator = isInitiator;
  }

  init(localStream: MediaStream) {
    this.localStream = localStream;
    this.pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    this.localStream.getTracks().forEach((track) => {
      if (this.localStream && this.pc) {
        this.pc.addTrack(track, this.localStream);
      }
    });

    // Remote track listener
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.callbacks.onRemoteStream(event.streams[0]);
      } else {
        this.remoteStream.addTrack(event.track);
        this.callbacks.onRemoteStream(this.remoteStream);
      }
    };

    // ICE Candidate generation
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // State changes
    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        this.callbacks.onConnectionStateChange(this.pc.connectionState);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc) {
        this.callbacks.onIceConnectionStateChange(this.pc.iceConnectionState);
      }
    };
  }

  async startCall() {
    if (!this.pc) return;
    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await this.pc.setLocalDescription(offer);
      this.sendSignal({
        type: 'offer',
        sdp: offer,
      });
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
    }
  }

  async handleSignal(signal: any) {
    if (!this.pc) return;

    try {
      if (signal.type === 'offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        // Process queued ice candidates
        for (const candidate of this.pendingCandidates) {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates = [];

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignal({
          type: 'answer',
          sdp: answer,
        });
      } else if (signal.type === 'answer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const candidate of this.pendingCandidates) {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates = [];
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
          await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          this.pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err);
    }
  }

  replaceVideoTrack(newTrack: MediaStreamTrack) {
    if (!this.pc) return;
    const senders = this.pc.getSenders();
    const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
    if (videoSender) {
      videoSender.replaceTrack(newTrack);
    }
  }

  close() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
