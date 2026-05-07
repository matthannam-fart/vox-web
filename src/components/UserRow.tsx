import { StatusOrb } from "./StatusOrb";
import type { Mode } from "../types";
import { DARK, COLORS } from "../lib/theme";

export type UserRowState = "idle" | "selected" | "connecting" | "live";

/// Visual state for the per-row pin button. Computed by the page from
/// pinStore so the row stays a dumb presentational component.
export type RowPinState = "idle" | "requesting" | "partner" | "hidden";

interface UserRowProps {
  userId: string;
  name: string;
  mode: Mode | "OFFLINE";
  state?: UserRowState;
  onClick?: (userId: string) => void;
  pinState?: RowPinState;
  onTogglePin?: () => void;
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

export const UserRow = ({
  userId,
  name,
  mode,
  state = "idle",
  onClick,
  pinState = "hidden",
  onTogglePin,
}: UserRowProps) => {
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

      {pinState === "partner" && (
        <span
          className="text-[9px] font-extrabold tracking-[1px] flex-shrink-0 px-1.5 py-0.5 rounded-[3px]"
          style={{
            color: COLORS.YELLOW,
            background: `${COLORS.YELLOW}21`,
            border: `1px solid ${COLORS.YELLOW}66`,
          }}
        >
          ROOM
        </span>
      )}
      {pinState !== "hidden" && (
        <PinIconButton state={pinState} onClick={onTogglePin} />
      )}
    </div>
  );
};

/// Small pin glyph next to each user name. Click cycles through the
/// available actions for the row's current state. Stops propagation so
/// it doesn't bubble up to the row's onClick (which selects the user).
const PinIconButton = ({
  state,
  onClick,
}: {
  state: RowPinState;
  onClick?: () => void;
}) => {
  const titles: Record<RowPinState, string> = {
    partner: "Unpin",
    requesting: "Cancel pin request",
    idle: "Pin (open mic with this user)",
    hidden: "",
  };
  const colors: Record<RowPinState, string> = {
    partner: COLORS.YELLOW,
    requesting: DARK.TEXT_DIM,
    idle: DARK.TEXT_FAINT,
    hidden: "transparent",
  };
  // Lucide-ish minimal pin glyph as inline SVG keeps zero-deps. Filled
  // when partner, slashed when an outgoing request is pending, outlined
  // otherwise.
  return (
    <button
      type="button"
      title={titles[state]}
      aria-label={titles[state]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex-shrink-0 bg-transparent border-none cursor-pointer p-0 w-[22px] h-[22px] flex items-center justify-center"
      style={{ color: colors[state] }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={state === "partner" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 17v5" />
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
        {state === "requesting" && <line x1="3" y1="3" x2="21" y2="21" />}
      </svg>
    </button>
  );
};
