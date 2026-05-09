/**
 * WebRTC manager — wraps simple-peer for audio calls.
 *
 * Signaling goes through the presence WebSocket (WEBRTC_SIGNAL messages).
 * Browser handles AEC, noise suppression, codec negotiation natively.
 */

import Peer from "simple-peer";

type SignalHandler = (data: unknown) => void;
type StreamHandler = (stream: MediaStream) => void;
type CloseHandler = () => void;
type ConnectHandler = () => void;

export class WebRTCManager {
  private peer: Peer.Instance | null = null;
  // Signals that arrived before createPeer ran. The pin path is racy:
  // the answerer's effect schedules createPeer on a microtask (waits for
  // requestMicrophone), but the offer can arrive on the WebSocket the
  // same tick. Without a queue, those early signals would be dropped
  // silently and the peer would never connect. Drained the moment the
  // peer is constructed.
  private pendingSignals: unknown[] = [];

  /// Short tag used to disambiguate log lines when more than one manager
  /// is alive (call + pin). Set by the owning hook.
  label: string = "call";

  onSignal: SignalHandler | null = null;
  onStream: StreamHandler | null = null;
  onClose: CloseHandler | null = null;
  onConnect: ConnectHandler | null = null;

  createPeer(initiator: boolean, localStream: MediaStream) {
    this.destroy();
    console.log(`[webrtc:${this.label}] Creating peer (initiator=${initiator})`);

    this.peer = new Peer({
      initiator,
      stream: localStream,
      trickle: true,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    this.peer.on("signal", (data) => {
      console.log(`[webrtc:${this.label}] Outgoing signal:`, (data as { type?: string }).type);
      this.onSignal?.(data);
    });

    this.peer.on("connect", () => {
      console.log(`[webrtc:${this.label}] Peer CONNECTED`);
      this.onConnect?.();
    });

    this.peer.on("stream", (stream) => {
      console.log(
        `[webrtc:${this.label}] Remote stream received, tracks:`,
        stream.getTracks().length,
      );
      this.onStream?.(stream);
    });

    this.peer.on("close", () => {
      console.log(`[webrtc:${this.label}] Peer closed`);
      this.onClose?.();
    });

    this.peer.on("error", (err) => {
      console.warn(`[webrtc:${this.label}] Peer error:`, err.message);
      this.onClose?.();
    });

    // Drain anything that arrived while the peer didn't exist yet.
    if (this.pendingSignals.length > 0) {
      console.log(
        `[webrtc:${this.label}] Draining ${this.pendingSignals.length} buffered signal(s)`,
      );
      const queued = this.pendingSignals;
      this.pendingSignals = [];
      for (const data of queued) {
        this.peer.signal(data as Peer.SignalData);
      }
    }

    return this.peer;
  }

  signal(data: unknown) {
    if (this.peer && !this.peer.destroyed) {
      this.peer.signal(data as Peer.SignalData);
    } else {
      // Peer not constructed yet (pin race) — buffer for createPeer to drain.
      console.log(`[webrtc:${this.label}] Buffering signal — peer not ready yet`);
      this.pendingSignals.push(data);
    }
  }

  destroy() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.pendingSignals = [];
  }

  get connected(): boolean {
    return this.peer?.connected ?? false;
  }

  get hasPeer(): boolean {
    return this.peer !== null && !this.peer.destroyed;
  }
}
