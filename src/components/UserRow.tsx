import { StatusOrb } from "./StatusOrb";
import type { Mode } from "../types";
import { DARK, COLORS } from "../lib/theme";

export type UserRowState = "idle" | "selected" | "connecting" | "live";

interface UserRowProps {
  userId: string;
  name: string;
  mode: Mode | "OFFLINE";
  state?: UserRowState;
  onClick?: (userId: string) => void;
}

const STATE_STYLES: Record<UserRowState, {
  bg: string;
  border: string;
  nameColor: string;
  label: string;
  labelColor: string;
}> = {
  idle: {
    bg: DARK.BG_RAISED,
    border: "transparent",
    nameColor: DARK.TEXT,
    label: "",
    labelColor: "",
  },
  selected: {
    bg: "rgba(0, 166, 81, 0.12)",
    border: "rgba(0, 166, 81, 0.67)",
    nameColor: DARK.ACCENT_LT,
    label: "TALK",
    labelColor: DARK.ACCENT,
  },
  connecting: {
    bg: "rgba(255, 255, 255, 0.06)",
    border: DARK.BORDER,
    nameColor: DARK.TEXT_DIM,
    label: "...",
    labelColor: DARK.TEXT_FAINT,
  },
  live: {
    bg: "rgba(229, 57, 53, 0.12)",
    border: "rgba(229, 57, 53, 0.25)",
    nameColor: DARK.DANGER,
    label: "LIVE",
    labelColor: DARK.DANGER,
  },
};

export const UserRow = ({ userId, name, mode, state = "idle", onClick }: UserRowProps) => {
  const isOffline = mode === "OFFLINE";
  const style = STATE_STYLES[state];

  // For selected state, use the actual mode color instead of hardcoded green
  const selectedBg =
    state === "selected" && mode !== "OFFLINE"
      ? `${COLORS[mode]}1f`
      : style.bg;
  const selectedBorder =
    state === "selected" && mode !== "OFFLINE"
      ? `${COLORS[mode]}aa`
      : style.border;

  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-[10px] transition-colors ${
        !isOffline ? "cursor-pointer" : ""
      }`}
      style={{
        background: selectedBg,
        borderLeft: state === "selected" ? `3px solid ${selectedBorder}` : "3px solid transparent",
        border: state !== "selected" ? `1px solid ${style.border}` : undefined,
        height: isOffline ? 40 : 50,
      }}
      onClick={() => !isOffline && onClick?.(userId)}
    >
      <StatusOrb mode={mode} size="sm" />

      <span
        className="flex-1 truncate"
        style={{
          fontSize: isOffline ? 13 : 15,
          fontWeight: isOffline ? 400 : 500,
          color: isOffline ? DARK.TEXT_FAINT : style.nameColor,
        }}
      >
        {name}
      </span>

      {style.label && (
        <span
          className="text-[10px] font-bold flex-shrink-0"
          style={{ color: style.labelColor }}
        >
          {style.label}
        </span>
      )}
    </div>
  );
};
