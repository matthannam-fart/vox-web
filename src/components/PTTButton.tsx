import { useCallback, useEffect, useState } from "react";
import { DARK, COLORS } from "../lib/theme";

interface PTTButtonProps {
  targetName: string | null;
  onPress: () => void;
  onRelease: () => void;
  disabled?: boolean;
}

export const PTTButton = ({ targetName, onPress, onRelease, disabled }: PTTButtonProps) => {
  const [held, setHeld] = useState(false);

  const handleDown = useCallback(() => {
    if (disabled) return;
    setHeld(true);
    onPress();
  }, [disabled, onPress]);

  const handleUp = useCallback(() => {
    if (held) {
      setHeld(false);
      onRelease();
    }
  }, [held, onRelease]);

  // Spacebar PTT
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !disabled) {
        e.preventDefault();
        handleDown();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleUp();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleDown, handleUp, disabled]);

  return (
    <button
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      disabled={disabled}
      className="w-full rounded-lg py-3 text-xs font-semibold select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      style={{
        background: held ? COLORS.GREEN : DARK.BG_RAISED,
        border: `1px solid ${held ? COLORS.GREEN : DARK.BORDER}`,
        color: held ? "white" : DARK.TEXT_DIM,
        boxShadow: held ? `0 0 12px ${COLORS.GREEN}40` : "none",
      }}
    >
      {held
        ? "TALKING"
        : targetName
          ? `Hold to talk to ${targetName}`
          : "Select a user to talk"}
    </button>
  );
};
