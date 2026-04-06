import { useEffect, useRef, useState } from "react";
import { DARK } from "../lib/theme";
import type { Page } from "../components/Layout";

const NTS_STREAMS = {
  1: "https://stream-relay-geo.ntslive.net/stream?client=NTSRadio",
  2: "https://stream-relay-geo.ntslive.net/stream2?client=NTSRadio",
};

interface RadioPageProps {
  onNavigate: (page: Page) => void;
}

export const RadioPage = (props: RadioPageProps) => {
  void props; // onNavigate available for future use
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [channel, setChannel] = useState<1 | 2>(1);
  const [volume, setVolume] = useState(0.8);
  const [title, setTitle] = useState("NTS Radio");

  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      try {
        const resp = await fetch("https://www.nts.live/api/v2/live");
        const data = await resp.json();
        const ch = data?.results?.[channel - 1];
        if (!cancelled && ch?.now?.broadcast_title) {
          setTitle(ch.now.broadcast_title);
        }
      } catch {
        // ignore
      }
    };
    doFetch();
    const interval = setInterval(doFetch, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [channel]);

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(NTS_STREAMS[channel]);
        audioRef.current.volume = volume;
      } else {
        audioRef.current.src = NTS_STREAMS[channel];
      }
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const switchChannel = (ch: 1 | 2) => {
    setChannel(ch);
    if (playing && audioRef.current) {
      audioRef.current.src = NTS_STREAMS[ch];
      audioRef.current.play();
    }
  };

  const handleVolume = (val: number) => {
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col px-4 py-4">
      {/* Header */}
      <p
        className="text-[9px] font-bold uppercase tracking-[1.5px] mb-4"
        style={{ color: DARK.TEXT_FAINT }}
      >
        Now Playing
      </p>

      {/* Title */}
      <p
        className="text-sm font-semibold mb-1 truncate"
        style={{ color: DARK.TEXT }}
      >
        {title}
      </p>
      <p className="text-[10px] mb-4" style={{ color: DARK.TEXT_DIM }}>
        NTS Radio &middot; Channel {channel}
      </p>

      {/* Channel selector */}
      <div className="flex gap-2 mb-4">
        {([1, 2] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => switchChannel(ch)}
            className="flex-1 rounded-[6px] py-1.5 text-[11px] font-semibold cursor-pointer"
            style={{
              background: channel === ch ? `${DARK.TEAL}22` : DARK.BG_RAISED,
              border: `1px solid ${channel === ch ? DARK.TEAL : DARK.BORDER}`,
              color: channel === ch ? DARK.TEAL : DARK.TEXT_DIM,
            }}
          >
            CH {ch}
          </button>
        ))}
      </div>

      {/* Play/Stop */}
      <button
        onClick={togglePlay}
        className="w-full rounded-lg py-2.5 text-xs font-semibold cursor-pointer mb-4"
        style={{
          background: playing ? DARK.DANGER : DARK.TEAL,
          color: "white",
          border: "none",
        }}
      >
        {playing ? "Stop" : "Play"}
      </button>

      {/* Volume */}
      <div>
        <label
          className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-1"
          style={{ color: DARK.TEXT_FAINT }}
        >
          Volume
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => handleVolume(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
};
