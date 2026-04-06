import { useEffect, useState } from "react";
import { DARK } from "../lib/theme";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-lg px-4 py-2.5 shadow-lg z-50"
      style={{
        background: DARK.BG_RAISED,
        border: `1px solid ${DARK.BORDER}`,
      }}
    >
      <span className="text-[11px]" style={{ color: DARK.TEXT }}>
        Install Vox for a better experience
      </span>
      <button
        onClick={handleInstall}
        className="rounded-md px-3 py-1 text-[10px] font-semibold cursor-pointer"
        style={{ background: DARK.TEAL, color: "white", border: "none" }}
      >
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-[10px] cursor-pointer bg-transparent border-none"
        style={{ color: DARK.TEXT_FAINT }}
      >
        &#10005;
      </button>
    </div>
  );
};
