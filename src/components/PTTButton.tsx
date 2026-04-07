import { useCallback, useEffect, useRef, useState } from "react";
import { DARK, COLORS } from "../lib/theme";

interface PTTButtonProps {
  targetName: string | null;
  onPress: () => void;
  onRelease: () => void;
  disabled?: boolean;
  isInCall?: boolean;
}

export const PTTButton = ({ targetName, onPress, onRelease, disabled, isInCall }: PTTButtonProps) => {
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);

  const handleDown = useCallback(() => {
    if (disabled || heldRef.current) return;
    heldRef.current = true;
    setHeld(true);
    onPress();
  }, [disabled, onPress]);

  const handleUp = useCallback(() => {
    if (heldRef.current) {
      heldRef.current = false;
      setHeld(false);
      onRelease();
    }
  }, [onRelease]);

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
        : isInCall
          ? `Hold to talk to ${targetName}`
          : targetName
            ? `Hold to call ${targetName}`
            : "Select a user to talk"}
    </button>
  );
};
