import { create } from "zustand";
import { PresenceClient } from "../lib/presence";
import type { Mode, PresenceUser, PresenceInMessage, CallState } from "../types";

// Callback for forwarding WebRTC signals to the WebRTC manager
type WebRTCSignalCallback = (signal: unknown) => void;
let _onWebRTCSignal: WebRTCSignalCallback | null = null;

export const setWebRTCSignalHandler = (handler: WebRTCSignalCallback | null) => {
  _onWebRTCSignal = handler;
};

interface PresenceState {
  // Connection
  connected: boolean;
  client: PresenceClient | null;

  // Presence (mirrors IntercomApp._team_members in main.py)
  onlineUsers: PresenceUser[];
  mode: Mode;
  incognito: boolean;

  // Call state
  call: CallState;

  // Actions
  connect: (userId: string, name: string, mode: Mode, teamId: string) => void;
  disconnect: () => void;
  setMode: (mode: Mode) => void;
  setIncognito: (incognito: boolean) => void;

  // Call actions
  callUser: (targetUserId: string) => void;
  acceptCall: (fromUserId: string, roomCode: string) => void;
  declineCall: (fromUserId: string) => void;
  endCall: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  connected: false,
  client: null,
  onlineUsers: [],
  mode: "GREEN",
  incognito: false,
  call: { status: "idle", peerId: null, peerName: null, roomCode: null },

  connect: (userId, name, mode, teamId) => {
    // Clean up existing client
    get().client?.disconnect();

    const client = new PresenceClient(
      // Message handler
      (msg: PresenceInMessage) => {
        switch (msg.type) {
          case "PRESENCE_UPDATE":
            set({ onlineUsers: msg.users });
            break;
          case "INCOMING_CALL":
            set({
              call: {
                status: "ringing",
                peerId: msg.from_user_id,
                peerName: msg.from_name,
                roomCode: null,
              },
            });
            break;
          case "CALL_ACCEPTED":
            set({
              call: {
                ...get().call,
                status: "connecting",
                roomCode: msg.room_code,
              },
            });
            break;
          case "CALL_DECLINED":
            set({
              call: { status: "idle", peerId: null, peerName: null, roomCode: null },
            });
            break;
          case "WEBRTC_SIGNAL":
            _onWebRTCSignal?.(msg.signal);
            break;
        }
      },
      // Status handler
      (connected) => set({ connected }),
    );

    client.connect(userId, name, mode, teamId);
    set({ client, mode });
  },

  disconnect: () => {
    get().client?.disconnect();
    set({ client: null, connected: false, onlineUsers: [] });
  },

  setMode: (mode) => {
    get().client?.send({ type: "MODE_UPDATE", mode });
    set({ mode });
  },

  setIncognito: (incognito) => set({ incognito }),

  callUser: (targetUserId) => {
    get().client?.send({ type: "CALL_REQUEST", target_user_id: targetUserId });
    const target = get().onlineUsers.find((u) => u.user_id === targetUserId);
    set({
      call: {
        status: "ringing",
        peerId: targetUserId,
        peerName: target?.name ?? "Unknown",
        roomCode: null,
      },
    });
  },

  acceptCall: (fromUserId, roomCode) => {
    get().client?.send({
      type: "CALL_ACCEPT",
      target_user_id: fromUserId,
      room_code: roomCode,
    });
    set({
      call: { ...get().call, status: "connecting", roomCode },
    });
  },

  declineCall: (fromUserId) => {
    get().client?.send({ type: "CALL_DECLINE", target_user_id: fromUserId });
    set({
      call: { status: "idle", peerId: null, peerName: null, roomCode: null },
    });
  },

  endCall: () => {
    // TODO: Close WebRTC peer connection (Phase 3)
    set({
      call: { status: "idle", peerId: null, peerName: null, roomCode: null },
    });
  },
}));
