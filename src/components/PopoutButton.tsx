import { useEffect } from "react";
import { DARK } from "../lib/theme";
import { useIsMobile, useIsStandalone } from "../lib/useMediaQuery";

const POPOUT_WIDTH = 340;
const POPOUT_HEIGHT = 640;

const isPopoutQuery = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("popout") === "1";
};

export const PopoutButton = () => {
  const isStandalone = useIsStandalone();
  const isMobile = useIsMobile();
  const isCompact = isStandalone || isPopoutQuery();

  useEffect(() => {
    if (!isCompact) return;
    // Try to resize — works in popout windows and most installed PWAs.
    // Browsers may ignore this for installed PWAs, but the layout fills
    // whatever size the user makes the window anyway.
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
