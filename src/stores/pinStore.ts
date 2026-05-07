import { create } from "zustand";
import { usePresenceStore } from "./presenceStore";

// pinStore — owns the "Pin" / "in the room" feature on web.
//
// Mirrors vox-mac/Sources/Vox/PinStore.swift. A pin is a mutual-consent
// persistent open audio line between two users (1:1 only for v1). Three
// concerns:
//
//   1. The current pinned partner (only one — strictly 1:1).
//   2. Outstanding incoming requests (others want to pin us).
//   3. Outstanding outgoing requests (we want to pin someone, awaiting accept).
//
// State lives only in memory for the lifetime of the WebSocket session;
// no persistence. Partner-disconnect is inferred from PRESENCE_UPDATE —
// when a pinned partner falls off the visible roster we clear locally.
//
// PR-1 owns the consent dance + presence reconciliation only. Audio
// behavior (long-lived peer connection, mic stays open, AEC engaged)
// lands in a follow-up PR. For now `partner != null` just means "we've
// agreed to be in a room" — no audio path is opened yet.

export interface PinPeer {
  userId: string;
  name: string;
}

interface PinState {
  partner: PinPeer | null;
  incoming: Record<string, PinPeer>;  // by userId so duplicate requests collapse
  outgoing: Set<string>;              // userIds we've requested

  // Outbound (user actions)
  requestPin: (target: PinPeer) => void;
  accept: (peer: PinPeer) => void;
  decline: (peer: PinPeer) => void;
  cancelOutgoing: (targetUserId: string) => void;
  unpin: () => void;

  // Inbound (presenceStore → here)
  receiveIncoming: (fromUserId: string, fromName: string) => void;
  receiveAccepted: (fromUserId: string, fromName: string) => void;
  receiveDeclined: (fromUserId: string) => void;
  receivePartnerLeft: (fromUserId: string) => void;
  receiveRemoved: (fromUserId: string) => void;

  /// Reconcile against the latest presence list — drop pin state
  /// referencing users who've gone offline. The relay doesn't track
  /// pairs, so partner-disconnect is inferred here.
  reconcile: (onlineUserIds: Set<string>) => void;
}

/// Auto-flip mode to YELLOW while pinned so the rest of the team sees us
/// as busy. Restores the previous mode when the pair tears down. Manual
/// mode changes during a pin are honored — savedMode tracks the latest
/// user choice so unpinning restores to "what they last picked," not
/// whatever they had at the moment they got pinned.
let modeBeforePin: "GREEN" | "YELLOW" | "RED" | null = null;

const onPinPartnerChanged = (oldPartner: PinPeer | null, newPartner: PinPeer | null) => {
  const wasPinned = oldPartner !== null;
  const isPinned = newPartner !== null;
  const presence = usePresenceStore.getState();
  if (!wasPinned && isPinned) {
    modeBeforePin = presence.mode;
    if (presence.mode !== "YELLOW") presence.setMode("YELLOW");
  } else if (wasPinned && !isPinned) {
    if (modeBeforePin) presence.setMode(modeBeforePin);
    modeBeforePin = null;
  }
};

const sendPin = (msg: import("../types").PresenceOutMessage) => {
  // PresenceClient is private to presenceStore — funnel through a small
  // helper there so all wire I/O stays in one place.
  usePresenceStore.getState().send(msg);
};

export const usePinStore = create<PinState>((set, get) => ({
  partner: null,
  incoming: {},
  outgoing: new Set(),

  // ── Outbound ────────────────────────────────────────────────────

  requestPin: (target) => {
    const s = get();
    if (s.partner !== null || s.outgoing.has(target.userId)) return;
    sendPin({ type: "PIN_REQUEST", target_user_id: target.userId });
    set({ outgoing: new Set([...s.outgoing, target.userId]) });
  },

  accept: (peer) => {
    const s = get();
    if (!(peer.userId in s.incoming)) return;
    sendPin({ type: "PIN_ACCEPT", target_user_id: peer.userId });
    // If we somehow already have a different partner, clean up first.
    // Mutual-consent semantics shouldn't allow this in normal flow but
    // defensive: replace > leak.
    if (s.partner && s.partner.userId !== peer.userId) {
      sendPin({ type: "PIN_REMOVE", target_user_id: s.partner.userId });
    }
    const oldPartner = s.partner;
    const { [peer.userId]: _consumed, ...rest } = s.incoming;
    void _consumed;
    set({ incoming: rest, partner: peer });
    onPinPartnerChanged(oldPartner, peer);
  },

  decline: (peer) => {
    const s = get();
    if (!(peer.userId in s.incoming)) return;
    sendPin({ type: "PIN_DECLINE", target_user_id: peer.userId });
    const { [peer.userId]: _consumed, ...rest } = s.incoming;
    void _consumed;
    set({ incoming: rest });
  },

  cancelOutgoing: (targetUserId) => {
    const s = get();
    if (!s.outgoing.has(targetUserId)) return;
    sendPin({ type: "PIN_REMOVE", target_user_id: targetUserId });
    const next = new Set(s.outgoing);
    next.delete(targetUserId);
    set({ outgoing: next });
  },

  unpin: () => {
    const s = get();
    if (!s.partner) return;
    sendPin({ type: "PIN_REMOVE", target_user_id: s.partner.userId });
    const oldPartner = s.partner;
    set({ partner: null });
    onPinPartnerChanged(oldPartner, null);
  },

  // ── Inbound ─────────────────────────────────────────────────────

  receiveIncoming: (fromUserId, fromName) => {
    const s = get();
    // Already pinned → auto-decline. Matches the 1:1-only spec.
    if (s.partner !== null) {
      sendPin({ type: "PIN_DECLINE", target_user_id: fromUserId });
      return;
    }
    set({
      incoming: { ...s.incoming, [fromUserId]: { userId: fromUserId, name: fromName } },
    });
  },

  receiveAccepted: (fromUserId, fromName) => {
    const s = get();
    const next = new Set(s.outgoing);
    next.delete(fromUserId);
    const oldPartner = s.partner;
    const newPartner: PinPeer = { userId: fromUserId, name: fromName };
    set({ outgoing: next, partner: newPartner });
    onPinPartnerChanged(oldPartner, newPartner);
  },

  receiveDeclined: (fromUserId) => {
    const s = get();
    if (!s.outgoing.has(fromUserId)) return;
    const next = new Set(s.outgoing);
    next.delete(fromUserId);
    set({ outgoing: next });
  },

  receivePartnerLeft: (_fromUserId) => {
    // TODO(open-mic-audio): branch on whether audio is active. For now
    // a no-op — partner stays "pinned" in the local model until an
    // explicit PIN_REMOVED arrives.
    void _fromUserId;
  },

  receiveRemoved: (fromUserId) => {
    const s = get();
    const nextOutgoing = new Set(s.outgoing);
    nextOutgoing.delete(fromUserId);
    const { [fromUserId]: _consumed, ...nextIncoming } = s.incoming;
    void _consumed;
    let nextPartner = s.partner;
    let oldPartner: PinPeer | null = null;
    if (s.partner?.userId === fromUserId) {
      oldPartner = s.partner;
      nextPartner = null;
    }
    set({ outgoing: nextOutgoing, incoming: nextIncoming, partner: nextPartner });
    if (oldPartner) onPinPartnerChanged(oldPartner, null);
  },

  reconcile: (onlineUserIds) => {
    const s = get();
    let oldPartner: PinPeer | null = null;
    let nextPartner = s.partner;
    if (s.partner && !onlineUserIds.has(s.partner.userId)) {
      oldPartner = s.partner;
      nextPartner = null;
    }
    const nextOutgoing = new Set([...s.outgoing].filter((id) => onlineUserIds.has(id)));
    const nextIncoming: Record<string, PinPeer> = {};
    for (const [id, peer] of Object.entries(s.incoming)) {
      if (onlineUserIds.has(id)) nextIncoming[id] = peer;
    }
    if (
      nextPartner !== s.partner ||
      nextOutgoing.size !== s.outgoing.size ||
      Object.keys(nextIncoming).length !== Object.keys(s.incoming).length
    ) {
      set({ partner: nextPartner, outgoing: nextOutgoing, incoming: nextIncoming });
      if (oldPartner) onPinPartnerChanged(oldPartner, null);
    }
  },
}));
