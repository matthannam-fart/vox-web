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

export class WebRTCManager {
  private peer: Peer.Instance | null = null;

  onSignal: SignalHandler | null = null;
  onStream: StreamHandler | null = null;
  onClose: CloseHandler | null = null;

  createPeer(initiator: boolean, localStream: MediaStream) {
    this.destroy();

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
      this.onSignal?.(data);
    });

    this.peer.on("stream", (stream) => {
      this.onStream?.(stream);
    });

    this.peer.on("close", () => {
      this.onClose?.();
    });

    this.peer.on("error", (err) => {
      console.warn("[webrtc] Peer error:", err.message);
      this.onClose?.();
    });

    return this.peer;
  }

  signal(data: unknown) {
    if (this.peer && !this.peer.destroyed) {
      this.peer.signal(data as Peer.SignalData);
    }
  }

  destroy() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  get connected(): boolean {
    return this.peer?.connected ?? false;
  }
}
