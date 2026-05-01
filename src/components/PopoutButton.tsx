import { useEffect } from "react";
import { DARK } from "../lib/theme";
import { useIsMobile } from "../lib/useMediaQuery";

const POPOUT_WIDTH = 340;
const POPOUT_HEIGHT = 640;

const detectCompactMode = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const isPopoutQuery = params.get("popout") === "1";
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isPopoutQuery || isStandalone;
};

export const PopoutButton = () => {
  const isCompact = detectCompactMode();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isCompact) return;
    // Try to resize — works in popout windows and most installed PWAs
    try {
      window.resizeTo(POPOUT_WIDTH, POPOUT_HEIGHT);
    } catch {
      // ignore
    }
  }, [isCompact]);

  // Pop-out windows are desktop-only — `window.open` with sizing isn't honored on mobile.
  if (isCompact || isMobile) return null;

  const openPopout = () => {
    const url = `${window.location.origin}${window.location.pathname}?popout=1`;
    window.open(
      url,
      "vox-popout",
      `width=${POPOUT_WIDTH},height=${POPOUT_HEIGHT},menubar=no,toolbar=no,location=no,status=no,resizable=yes`,
    );
  };

  return (
    <button
      onClick={openPopout}
      className="fixed top-4 right-4 rounded-md px-3 py-1.5 text-[11px] font-semibold cursor-pointer z-50"
      style={{
        background: DARK.BG_RAISED,
        border: `1px solid ${DARK.BORDER}`,
        color: DARK.TEXT,
      }}
      title="Open in popout window"
    >
      ⧉ Pop out
    </button>
  );
};
