import { useCallback, useSyncExternalStore } from "react";

export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
    [query],
  );

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export const useIsMobile = () => useMediaQuery("(max-width: 600px)");

// True when running as an installed PWA / standalone window (any display mode
// that's not a normal browser tab). Covers Chrome's window-controls-overlay,
// minimal-ui, standalone, plus iOS Safari's navigator.standalone.
export const useIsStandalone = (): boolean => {
  const wco = useMediaQuery("(display-mode: window-controls-overlay)");
  const minimal = useMediaQuery("(display-mode: minimal-ui)");
  const standalone = useMediaQuery("(display-mode: standalone)");
  const fullscreen = useMediaQuery("(display-mode: fullscreen)");
  const iosStandalone =
    typeof window !== "undefined" &&
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return wco || minimal || standalone || fullscreen || iosStandalone;
};
