import { useEffect, useState } from "react";
import { LevelMeter } from "./LevelMeter";
import { DARK } from "../lib/theme";

interface CallBannerProps {
  peerName: string;
  micLevel: number;
  speakerLevel: number;
  onEnd: () => void;
}

export const CallBanner = ({ peerName, micLevel, speakerLevel, onEnd }: CallBannerProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="px-3.5 py-2.5"
      style={{
        background: DARK.BG_RAISED,
        borderBottom: `1px solid ${DARK.BORDER}`,
      }}
    >
      {/* Peer info */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: DARK.TEXT }}>
            {peerName}
          </p>
          <p className="text-[10px]" style={{ color: DARK.ACCENT }}>
            Connected &middot; {fmt(elapsed)}
          </p>
        </div>
        <button
          onClick={onEnd}
          className="rounded-lg px-4 py-1.5 text-[11px] font-semibold cursor-pointer"
          style={{
            background: DARK.DANGER,
            color: "white",
            border: "none",
          }}
        >
          End
        </button>
      </div>

      {/* Level meters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: DARK.TEXT_FAINT }}>
            MIC
          </span>
          <LevelMeter level={micLevel} color="#4caf50" width={50} height={4} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: DARK.TEXT_FAINT }}>
            SPK
          </span>
          <LevelMeter level={speakerLevel} color="#42a5f5" width={50} height={4} />
        </div>
      </div>
    </div>
  );
};
