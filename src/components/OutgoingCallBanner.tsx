import { GlowingOrb } from "./GlowingOrb";
import { DARK } from "../lib/theme";

interface OutgoingCallBannerProps {
  targetName: string;
  onCancel: () => void;
}

export const OutgoingCallBanner = ({ targetName, onCancel }: OutgoingCallBannerProps) => {
  return (
    <div
      className="px-3.5 py-2.5"
      style={{
        background: DARK.BG_RAISED,
        borderBottom: `1px solid ${DARK.BORDER}`,
      }}
    >
      {/* Target info */}
      <div className="flex items-center gap-2.5 mb-2">
        <GlowingOrb mode="GREEN" size={24} breathing />
        <div>
          <p className="text-sm font-semibold" style={{ color: DARK.TEXT }}>
            {targetName}
          </p>
          <p className="text-[11px]" style={{ color: DARK.TEXT_DIM }}>
            Calling...
          </p>
        </div>
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="w-full rounded-lg py-1.5 text-[13px] font-semibold cursor-pointer"
        style={{
          background: "transparent",
          border: `1px solid rgba(229, 57, 53, 0.3)`,
          color: DARK.DANGER,
        }}
      >
        Cancel
      </button>
    </div>
  );
};
