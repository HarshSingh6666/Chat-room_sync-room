
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

export function createSilentAudioTrack(): { track: MediaStreamTrack; stop: () => void } | null {
  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtxClass) return null;

    const audioCtx = new AudioCtxClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const dest = audioCtx.createMediaStreamDestination();

    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    const track = dest.stream.getAudioTracks()[0];
    if (!track) return null;

    return {
      track,
      stop: () => {
        track.stop();
        if (audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
      },
    };
  } catch (err) {
    console.warn('Silent audio creation failed:', err);
    return null;
  }
}

/**
 * Creates an animated canvas video stream + silent audio track
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

    const grad = ctx.createLinearGradient(
      0, 0, canvas.width, canvas.height
    );

    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    const orbGrad = ctx.createRadialGradient(
      cx - 15, cy - 15, 10, cx, cy, 55
    );

    orbGrad.addColorStop(0, '#818cf8');
    orbGrad.addColorStop(1, '#4338ca');

    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const initials = label.slice(0, 2).toUpperCase() || 'SR';
    ctx.fillText(initials, cx, cy);

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

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(
      `${label} (Virtual Avatar Feed)`,
      cx,
      canvas.height - 35
    );

    animationFrameId = requestAnimationFrame(render);
  };

  render();

  const canvasStream = canvas.captureStream(30);

  let audioTrack: MediaStreamTrack | null = null;
  let audioCtx: AudioContext | null = null;

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as {
        webkitAudioContext: typeof AudioContext;
      }).webkitAudioContext;

    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const dest = audioCtx.createMediaStreamDestination();

      gain.gain.value = 0;

      osc.connect(gain);
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

  private isMakingOffer = false;

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
    if (this.pc) return;

    this.localStream = localStream;
    this.pc = new RTCPeerConnection(ICE_SERVERS);

    const pc = this.pc;

    // Add local audio and video tracks
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle remote audio and video tracks
    pc.ontrack = (event) => {
      const incomingStream = event.streams?.[0];

      if (incomingStream) {
        this.remoteStream = incomingStream;
      } else {
        if (
          !this.remoteStream.getTracks().some(
            (track) => track.id === event.track.id
          )
        ) {
          this.remoteStream.addTrack(event.track);
        }
      }

      // Re-wrap in fresh MediaStream so React detects newly added audio/video tracks
      const stream = new MediaStream(this.remoteStream.getTracks());
      this.callbacks.onRemoteStream(stream);

      event.track.onunmute = () => {
        const updated = new MediaStream(this.remoteStream.getTracks());
        this.callbacks.onRemoteStream(updated);
      };

      event.track.onended = () => {
        const updated = new MediaStream(this.remoteStream.getTracks());
        this.callbacks.onRemoteStream(updated);
      };
    };

    // ICE candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      if (this.pc === pc) {
        this.callbacks.onConnectionStateChange(pc.connectionState);
      }
    };

    // ICE connection monitoring
    pc.oniceconnectionstatechange = () => {
      if (this.pc === pc) {
        this.callbacks.onIceConnectionStateChange(
          pc.iceConnectionState
        );
      }
    };
  }

  // Create and send offer
  async startCall(): Promise<boolean> {
    const pc = this.pc;

    if (
      !pc ||
      !this.isInitiator ||
      pc.signalingState !== 'stable' ||
      this.isMakingOffer
    ) {
      return false;
    }

    try {
      this.isMakingOffer = true;

      const offer = await pc.createOffer();

      if (pc.signalingState !== 'stable') return false;

      await pc.setLocalDescription(offer);

      if (pc.localDescription) {
        this.sendSignal({
          type: 'offer',
          sdp: pc.localDescription,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
      return false;
    } finally {
      this.isMakingOffer = false;
    }
  }

  // Process queued ICE candidates
  private async processPendingCandidates() {
    const pc = this.pc;

    if (!pc?.remoteDescription) return;

    const candidates = [...this.pendingCandidates];
    this.pendingCandidates = [];

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err);
      }
    }
  }

  // Handle incoming offer, answer and ICE signals
  async handleSignal(signal: any) {
    const pc = this.pc;

    if (!pc || !signal) return;

    try {
      if (signal.type === 'offer') {
        if (pc.signalingState !== 'stable') {
          console.warn(
            'Ignoring offer because signaling state is:',
            pc.signalingState
          );
          return;
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription(signal.sdp)
        );

        await this.processPendingCandidates();

        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

        if (pc.localDescription) {
          this.sendSignal({
            type: 'answer',
            sdp: pc.localDescription,
          });
        }
      }

      else if (signal.type === 'answer') {
        if (pc.signalingState !== 'have-local-offer') {
          return;
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription(signal.sdp)
        );

        await this.processPendingCandidates();
      }

      else if (signal.type === 'candidate' && signal.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(
            new RTCIceCandidate(signal.candidate)
          );
        } else {
          this.pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err);
    }
  }

  // Replace camera video with screen sharing video or vice versa
  async replaceVideoTrack(newTrack: MediaStreamTrack) {
    if (!this.pc || newTrack.kind !== 'video') return;

    const videoSender = this.pc
      .getSenders()
      .find((sender) => sender.track?.kind === 'video');

    if (!videoSender) {
      console.warn('No video sender found for track replacement.');
      return;
    }

    try {
      await videoSender.replaceTrack(newTrack);
    } catch (err) {
      console.error('Error replacing video track:', err);
    }
  }

  // Replace audio track when user grants mic permission or changes microphone
  async replaceAudioTrack(newTrack: MediaStreamTrack) {
    if (!this.pc || newTrack.kind !== 'audio') return;

    const audioSender = this.pc
      .getSenders()
      .find((sender) => sender.track?.kind === 'audio');

    if (!audioSender) {
      console.warn('No audio sender found for track replacement.');
      return;
    }

    try {
      await audioSender.replaceTrack(newTrack);
    } catch (err) {
      console.error('Error replacing audio track:', err);
    }
  }

  // Close peer connection
  close() {
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;

      this.pc.close();
      this.pc = null;
    }

    this.pendingCandidates = [];
    this.isMakingOffer = false;

    this.remoteStream.getTracks().forEach((track) => {
      track.onended = null;
      track.onunmute = null;
    });

    this.remoteStream = new MediaStream();
    this.localStream = null;
  }
}
