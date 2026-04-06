import { GlowingOrb } from "./GlowingOrb";
import { DARK } from "../lib/theme";

interface IncomingCallBannerProps {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallBanner = ({
  callerName,
  onAccept,
  onDecline,
}: IncomingCallBannerProps) => {
  return (
    <div
      className="px-3.5 py-2.5"
      style={{
        background: DARK.BG_RAISED,
        borderBottom: `1px solid ${DARK.BORDER}`,
      }}
    >
      {/* Caller info */}
      <div className="flex items-center gap-2.5 mb-2">
        <GlowingOrb mode="GREEN" size={24} breathing />
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: DARK.TEXT }}
          >
            {callerName}
          </p>
          <p className="text-[11px]" style={{ color: DARK.TEXT_DIM }}>
            Incoming call...
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 rounded-lg py-1.5 text-[13px] font-semibold cursor-pointer"
          style={{
            background: DARK.ACCENT,
            color: "white",
            border: "none",
          }}
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="flex-1 rounded-lg py-1.5 text-[13px] font-medium cursor-pointer"
          style={{
            background: "transparent",
            border: `1px solid rgba(229, 57, 53, 0.3)`,
            color: DARK.DANGER,
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
};
