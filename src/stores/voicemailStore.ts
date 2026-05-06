import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Voicemail } from "../types";

// Web equivalent of the Swift VoicemailStore. RLS-aligned: SELECT requires
// sender or recipient = auth.uid(); INSERT requires sender_id = auth.uid()
// AND both sender and recipient are members of the team_id. Storage bucket
// `voicemails` is private; playback uses signed URLs.

const BUCKET = "voicemails";
const POLL_INTERVAL_MS = 15_000;

interface VoicemailState {
  voicemails: Voicemail[];
  loading: boolean;
  error: string | null;

  load: (userId: string) => Promise<void>;
  send: (params: {
    blob: Blob;
    mimeType: string;
    duration_ms: number;
    teamId: string;
    senderId: string;
    recipientId: string;
  }) => Promise<boolean>;
  markPlayed: (voicemail: Voicemail) => Promise<void>;
  remove: (voicemail: Voicemail) => Promise<void>;
  signedUrl: (voicemail: Voicemail) => Promise<string | null>;

  // Polling lifecycle — start when user signs in, stop on sign-out.
  startWatching: (userId: string) => void;
  stopWatching: () => void;
}

let pollHandle: ReturnType<typeof setInterval> | null = null;
let watchingFor: string | null = null;

export const useVoicemailStore = create<VoicemailState>((set, get) => ({
  voicemails: [],
  loading: false,
  error: null,

  load: async (userId) => {
    set({ loading: true, error: null });

    // Two queries — one for inbox (we are the recipient), one for sent (we
    // are the sender). Done sequentially because the embed alias differs.
    const inboxRes = await supabase
      .from("voicemails")
      .select(
        "id, team_id, sender_id, recipient_id, storage_path, duration_ms, created_at, played_at, sender:profiles!voicemails_sender_id_fkey(id, display_name)",
      )
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const sentRes = await supabase
      .from("voicemails")
      .select(
        "id, team_id, sender_id, recipient_id, storage_path, duration_ms, created_at, played_at, recipient:profiles!voicemails_recipient_id_fkey(id, display_name)",
      )
      .eq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (inboxRes.error || sentRes.error) {
      set({
        loading: false,
        error: (inboxRes.error ?? sentRes.error)?.message ?? "Failed to load voicemails",
      });
      return;
    }

    // PostgREST returns embedded relations as arrays in the generic client
    // typings even for many-to-one joins, so we accept either shape and
    // pull the first element if it's an array.
    type Profile = { id: string; display_name: string };
    type RowIn = {
      id: string;
      team_id: string;
      sender_id: string;
      recipient_id: string;
      storage_path: string;
      duration_ms: number;
      created_at: string;
      played_at: string | null;
      sender?: Profile | Profile[] | null;
      recipient?: Profile | Profile[] | null;
    };
    const profile = (
      embed: Profile | Profile[] | null | undefined,
    ): Profile | undefined =>
      Array.isArray(embed) ? embed[0] : embed ?? undefined;

    const toVoicemail = (
      row: RowIn,
      direction: "inbox" | "sent",
    ): Voicemail => ({
      id: row.id,
      team_id: row.team_id,
      sender_id: row.sender_id,
      sender_name: profile(row.sender)?.display_name ?? "Unknown",
      recipient_id: row.recipient_id,
      recipient_name: profile(row.recipient)?.display_name ?? "Unknown",
      storage_path: row.storage_path,
      duration_ms: row.duration_ms,
      created_at: row.created_at,
      played_at: row.played_at,
      direction,
    });

    const inbox = (inboxRes.data ?? []).map((r) =>
      toVoicemail(r as unknown as RowIn, "inbox"),
    );
    const sent = (sentRes.data ?? []).map((r) =>
      toVoicemail(r as unknown as RowIn, "sent"),
    );

    // Merge, dedupe by id (a voicemail to oneself would appear twice — rare,
    // but harmless to guard), and sort newest first.
    const seen = new Set<string>();
    const all: Voicemail[] = [];
    for (const v of [...inbox, ...sent]) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      all.push(v);
    }
    all.sort((a, b) => b.created_at.localeCompare(a.created_at));

    set({ voicemails: all, loading: false });
  },

  send: async ({ blob, mimeType, duration_ms, teamId, senderId, recipientId }) => {
    set({ error: null });
    const voicemailId = crypto.randomUUID();
    // Lowercase the sender folder; storage RLS is case-insensitive but
    // canonical form keeps the path matching the sender_id column.
    const storagePath = `${senderId.toLowerCase()}/${voicemailId}.${extensionFor(mimeType)}`;

    const upload = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
      contentType: mimeType,
      upsert: false,
    });
    if (upload.error) {
      set({ error: `Upload failed: ${upload.error.message}` });
      return false;
    }

    const insert = await supabase.from("voicemails").insert({
      id: voicemailId,
      team_id: teamId,
      sender_id: senderId,
      recipient_id: recipientId,
      storage_path: storagePath,
      duration_ms,
    });
    if (insert.error) {
      // Roll back the upload so we don't orphan a blob.
      await supabase.storage.from(BUCKET).remove([storagePath]);
      set({ error: `Send failed: ${insert.error.message}` });
      return false;
    }

    // Optimistic insert — don't wait for the next poll.
    const optimistic: Voicemail = {
      id: voicemailId,
      team_id: teamId,
      sender_id: senderId,
      sender_name: "You",
      recipient_id: recipientId,
      recipient_name: "—",
      storage_path: storagePath,
      duration_ms,
      created_at: new Date().toISOString(),
      played_at: null,
      direction: "sent",
    };
    set({ voicemails: [optimistic, ...get().voicemails] });
    return true;
  },

  markPlayed: async (voicemail) => {
    if (voicemail.played_at != null || voicemail.direction !== "inbox") return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("voicemails")
      .update({ played_at: now })
      .eq("id", voicemail.id);
    if (error) return;
    set({
      voicemails: get().voicemails.map((v) =>
        v.id === voicemail.id ? { ...v, played_at: now } : v,
      ),
    });
  },

  remove: async (voicemail) => {
    // Storage first: the storage RLS read policy depends on the row, so
    // once we delete the row the blob is unreachable to anyone except the
    // service role anyway. Removing the blob first keeps things tidy.
    await supabase.storage.from(BUCKET).remove([voicemail.storage_path]);
    const { error } = await supabase.from("voicemails").delete().eq("id", voicemail.id);
    if (error) {
      set({ error: `Delete failed: ${error.message}` });
      return;
    }
    set({ voicemails: get().voicemails.filter((v) => v.id !== voicemail.id) });
  },

  signedUrl: async (voicemail) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(voicemail.storage_path, 300);
    if (error || !data) return null;
    return data.signedUrl;
  },

  startWatching: (userId) => {
    if (watchingFor === userId && pollHandle) return;
    if (pollHandle) clearInterval(pollHandle);
    watchingFor = userId;
    void get().load(userId);
    pollHandle = setInterval(() => {
      const uid = watchingFor;
      if (uid) void get().load(uid);
    }, POLL_INTERVAL_MS);
  },

  stopWatching: () => {
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = null;
    watchingFor = null;
    set({ voicemails: [] });
  },
}));

/// Returns a sensible file extension for the recorded mime so the storage
/// path is human-friendly. Falls back to `webm` since that's what Chrome
/// emits by default.
function extensionFor(mimeType: string): string {
  if (mimeType.startsWith("audio/mp4")) return "m4a";
  if (mimeType.startsWith("audio/aac")) return "aac";
  if (mimeType.startsWith("audio/ogg")) return "ogg";
  return "webm";
}
