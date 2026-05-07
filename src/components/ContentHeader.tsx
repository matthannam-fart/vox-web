import { useEffect, useRef, useState } from "react";
import { DARK } from "../lib/theme";
import { useTeamStore } from "../stores/teamStore";
import { useSettingsStore } from "../stores/settingsStore";
import { shareInviteMessage } from "../lib/team";
import type { Page } from "./Layout";

interface ContentHeaderProps {
  teamName: string | null;
  onNavigate: (page: Page) => void;
}

export const ContentHeader = ({ teamName, onNavigate }: ContentHeaderProps) => {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ borderBottom: `1px solid ${DARK.BORDER_LT}` }}
    >
      <TeamMenu teamName={teamName} />
      <button
        onClick={() => onNavigate("settings")}
        className="text-base cursor-pointer bg-transparent border-none"
        style={{ color: DARK.TEXT_DIM }}
      >
        &#9881;
      </button>
    </div>
  );
};

/// Click the team name to drop down a small action menu (Copy invite
/// code + Share invite). Mirrors `vox-mac/Sources/Vox/UI/UsersView.swift`'s
/// `teamMenu`. Falls back to navigating to the Teams page if there's no
/// active team yet.
const TeamMenu = ({ teamName }: { teamName: string | null }) => {
  const { teams } = useTeamStore();
  const { activeTeamId } = useSettingsStore();
  const team = teams.find((t) => t.id === activeTeamId);

  const [open, setOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"code" | "share" | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Click-outside / escape close. Bound only while open so it's cheap when
  // the menu is dormant, which is most of the time.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const flash = (field: "code" | "share") => {
    setCopiedField(field);
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1200);
  };

  const onCopyCode = () => {
    if (!team) return;
    void navigator.clipboard.writeText(team.invite_code);
    flash("code");
  };

  const onShareInvite = async () => {
    if (!team) return;
    const message = shareInviteMessage(team);
    // Web Share API on devices that have it (mobile Safari/Chrome, some
    // desktop). On desktop browsers without it, fall back to clipboard
    // — same outcome the mac app's "Share invite" gives when the user
    // picks "Copy" from the OS share sheet.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join me on Vox", text: message });
        setOpen(false);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    await navigator.clipboard.writeText(message);
    flash("share");
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[13px] font-semibold cursor-pointer bg-transparent border-none"
        style={{ color: DARK.TEXT }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {teamName ?? "No Team"}
        <span
          className="text-[8px] inline-block"
          style={{
            color: DARK.TEXT_FAINT,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.12s ease",
          }}
        >
          &#9660;
        </span>
      </button>

      {open && team && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 rounded-md shadow-lg overflow-hidden z-50"
          style={{
            background: DARK.BG_RAISED,
            border: `1px solid ${DARK.BORDER}`,
            minWidth: 220,
          }}
        >
          <MenuItem
            label={
              copiedField === "code"
                ? `✓ Copied  ${team.invite_code}`
                : `Copy invite code  (${team.invite_code})`
            }
            onClick={onCopyCode}
          />
          <MenuItem
            label={
              copiedField === "share"
                ? "✓ Invite copied to clipboard"
                : "Share invite…"
            }
            onClick={onShareInvite}
          />
        </div>
      )}
    </div>
  );
};

const MenuItem = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    role="menuitem"
    onClick={onClick}
    className="block w-full text-left px-3 py-2 text-[12px] cursor-pointer bg-transparent border-none"
    style={{ color: DARK.TEXT }}
    onMouseEnter={(e) => (e.currentTarget.style.background = DARK.BG_HOVER)}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    {label}
  </button>
);
