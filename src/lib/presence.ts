/**
 * WebSocket presence client for the Vox relay server.
 *
 * Mirrors the TCP presence protocol in network_manager.py but over WebSocket.
 * The relay server needs a WSS endpoint added (Phase 2 of the plan).
 *
 * Protocol (same JSON messages as desktop):
 *   → REGISTER { auth_key, user_id, name, mode, team_id }
 *   ← REGISTERED { user_id }
 *   ← PRESENCE_UPDATE { users: [...] }
 *   → MODE_UPDATE { mode }
 *   → PING / ← PONG  (every 30s)
 */

import type { PresenceOutMessage, PresenceInMessage } from "../types";

const RELAY_HOST = import.meta.env.VITE_RELAY_HOST ?? "relay.getvox.net";
const RELAY_PORT = import.meta.env.VITE_RELAY_WS_PORT ?? "50003";
const RELAY_PROTOCOL = import.meta.env.VITE_RELAY_PROTOCOL ?? "wss"; // "ws" or "wss"
const RELAY_AUTH_KEY = import.meta.env.VITE_RELAY_KEY ?? "aMq3HRtW5R93PNC7K5gr1pi_OblJwBaCJAcFVjhPoow";

type MessageHandler = (msg: PresenceInMessage) => void;
type StatusHandler = (connected: boolean) => void;

export class PresenceClient {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private shouldReconnect = false;

  private onMessage: MessageHandler;
  private onStatus: StatusHandler;

  constructor(onMessage: MessageHandler, onStatus: StatusHandler) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }

  connect(userId: string, name: string, mode: string, teamId: string) {
    this.shouldReconnect = true;
    this.disconnect();

    const url = `${RELAY_PROTOCOL}://${RELAY_HOST}:${RELAY_PORT}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.onStatus(true);

      // Register with relay (same as desktop REGISTER message)
      this.send({
        type: "REGISTER",
        auth_key: RELAY_AUTH_KEY,
        user_id: userId,
        name,
        mode: mode as "GREEN" | "YELLOW" | "RED",
        team_id: teamId,
      });

      // Heartbeat every 30s (matches desktop PING interval)
      this.pingInterval = setInterval(() => this.send({ type: "PING" }), 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as PresenceInMessage;
        this.onMessage(msg);
      } catch {
        console.warn("[presence] Failed to parse message:", event.data);
      }
    };

    this.ws.onclose = () => {
      this.cleanup();
      this.onStatus(false);
      if (this.shouldReconnect) {
        this.scheduleReconnect(userId, name, mode, teamId);
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this — reconnect handled there
    };
  }

  send(msg: PresenceOutMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private scheduleReconnect(userId: string, name: string, mode: string, teamId: string) {
    this.reconnectTimeout = setTimeout(() => {
      console.log(`[presence] Reconnecting in ${this.reconnectDelay}ms...`);
      this.connect(userId, name, mode, teamId);
    }, this.reconnectDelay);

    // Exponential backoff with cap
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }
}
