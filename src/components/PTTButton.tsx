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

  // Spacebar PTT — but only when focus isn't in a text field, so users can type spaces.
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || disabled) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      handleDown();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      handleUp();
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
          ? targetName ? `Hold to talk to ${targetName}` : "Hold to talk"
          : targetName
            ? `Hold to call ${targetName}`
            : "Select a user to talk"}
    </button>
  );
};
