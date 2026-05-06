import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useVoicemailStore } from "../stores/voicemailStore";
import { ContentHeader } from "../components/ContentHeader";
import { DARK } from "../lib/theme";
import type { Voicemail } from "../types";
import type { Page } from "../components/Layout";

interface MessagesPageProps {
  onNavigate: (page: Page) => void;
}

export const MessagesPage = ({ onNavigate }: MessagesPageProps) => {
  const { userId } = useAuthStore();
  const { voicemails, load, markPlayed, remove, signedUrl } = useVoicemailStore();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  // Stop any audio when leaving the page so playback doesn't leak.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const onPlay = async (v: Voicemail) => {
    audioRef.current?.pause();

    if (playingId === v.id) {
      setPlayingId(null);
      return;
    }

    const url = await signedUrl(v);
    if (!url) return;
    const audio = new Audio(url);
    audio.addEventListener("ended", () => setPlayingId(null));
    audio.addEventListener("error", () => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(v.id);
    void audio.play();
    void markPlayed(v);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ContentHeader teamName="Inbox" onNavigate={onNavigate} />

      {voicemails.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
          <span className="text-3xl" aria-hidden>
            &#128229;
          </span>
          <p className="text-[12px] font-semibold" style={{ color: DARK.TEXT }}>
            No messages yet
          </p>
          <p className="text-[10px] leading-snug" style={{ color: DARK.TEXT_FAINT }}>
            When someone leaves you a voicemail (you're <strong>BUSY</strong> and they
            tap and hold) it shows up here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
          {voicemails.map((v) => (
            <Row
              key={v.id}
              voicemail={v}
              isPlaying={playingId === v.id}
              onPlay={() => onPlay(v)}
              onDelete={() => void remove(v)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface RowProps {
  voicemail: Voicemail;
  isPlaying: boolean;
  onPlay: () => void;
  onDelete: () => void;
}

const Row = ({ voicemail, isPlaying, onPlay, onDelete }: RowProps) => {
  const isUnplayed = voicemail.direction === "inbox" && !voicemail.played_at;
  const counterpart =
    voicemail.direction === "inbox" ? voicemail.sender_name : voicemail.recipient_name;
  const directionPrefix = voicemail.direction === "inbox" ? "From" : "To";

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-2 rounded-md"
      style={{ background: DARK.BG_RAISED }}
    >
      <button
        onClick={onPlay}
        className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: isPlaying ? DARK.DANGER : DARK.ACCENT,
          color: "white",
          border: "none",
        }}
        title={isPlaying ? "Stop" : "Play"}
      >
        <span className="text-[10px]">{isPlaying ? "■" : "▶"}</span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isUnplayed && (
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: DARK.ACCENT }}
            />
          )}
          <span
            className="text-[12px] font-semibold truncate"
            style={{ color: DARK.TEXT }}
          >
            {directionPrefix} {counterpart}
          </span>
        </div>
        <div className="text-[10px]" style={{ color: DARK.TEXT_FAINT }}>
          {formatDuration(voicemail.duration_ms)} &middot; {formatRelative(voicemail.created_at)}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-[10px] cursor-pointer bg-transparent border-none"
        style={{ color: DARK.TEXT_FAINT }}
        title="Delete"
      >
        Delete
      </button>
    </div>
  );
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
