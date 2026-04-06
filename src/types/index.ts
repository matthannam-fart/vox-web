// ── Mode ─────────────────────────────────────────────────────
// Maps to desktop app's GREEN / YELLOW / RED status modes

export type Mode = "GREEN" | "YELLOW" | "RED";

export const MODE_LABELS: Record<Mode, string> = {
  GREEN: "Available",
  YELLOW: "Busy",
  RED: "Do Not Disturb",
};

// ── User & Team ──────────────────────────────────────────────

export interface Profile {
  id: string;
  display_name: string;
  email?: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  user_id: string;
  team_id: string;
  display_name: string;
  role: "admin" | "member";
  joined_at: string;
}

export interface JoinRequest {
  id: string;
  user_id: string;
  team_id: string;
  display_name: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
}

// ── Presence ─────────────────────────────────────────────────
// Matches the relay server's presence protocol (relay_server.py)

export interface PresenceUser {
  user_id: string;
  name: string;
  mode: Mode;
  team_id: string;
  incognito?: boolean;
  platform?: "desktop" | "web";
}

/** Messages sent TO the relay server */
export type PresenceOutMessage =
  | { type: "REGISTER"; auth_key: string; user_id: string; name: string; mode: Mode; team_id: string }
  | { type: "MODE_UPDATE"; mode: Mode }
  | { type: "PING" }
  | { type: "CALL_REQUEST"; target_user_id: string }
  | { type: "CALL_ACCEPT"; target_user_id: string; room_code: string }
  | { type: "CALL_DECLINE"; target_user_id: string }
  | { type: "WEBRTC_SIGNAL"; target_user_id: string; signal: unknown };

/** Messages received FROM the relay server */
export type PresenceInMessage =
  | { type: "PRESENCE_UPDATE"; users: PresenceUser[] }
  | { type: "REGISTERED"; user_id: string }
  | { type: "PONG" }
  | { type: "INCOMING_CALL"; from_user_id: string; from_name: string }
  | { type: "CALL_ACCEPTED"; from_user_id: string; room_code: string }
  | { type: "CALL_DECLINED"; from_user_id: string }
  | { type: "WEBRTC_SIGNAL"; from_user_id: string; signal: unknown }
  | { type: "ERROR"; message: string };

// ── Call State ───────────────────────────────────────────────

export type CallStatus = "idle" | "ringing" | "connecting" | "connected" | "voicemail";

export interface CallState {
  status: CallStatus;
  peerId: string | null;
  peerName: string | null;
  roomCode: string | null;
}
