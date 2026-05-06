import { GlowingOrb } from "./GlowingOrb";
import { StatusOrb } from "./StatusOrb";
import { DARK } from "../lib/theme";
import { usePresenceStore } from "../stores/presenceStore";
import { useVoicemailStore } from "../stores/voicemailStore";
import type { Mode } from "../types";
import type { Page } from "./Layout";

interface SidebarProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
}

const NAV_ITEMS: { key: Page; icon: string; label: string }[] = [
  { key: "users", icon: "\u{1F465}", label: "TEAM" },
  { key: "teams", icon: "\u{1F4CB}", label: "TEAMS" },
  { key: "messages", icon: "\u{1F4E5}", label: "INBOX" },
  { key: "settings", icon: "\u2699", label: "SET" },
];

export const Sidebar = ({ onNavigate, currentPage }: SidebarProps) => {
  const { mode, setMode, onlineUsers } = usePresenceStore();
  const unreadCount = useVoicemailStore((s) =>
    s.voicemails.filter((v) => v.direction === "inbox" && !v.played_at).length,
  );

  const cycleMode = () => {
    const modes: Mode[] = ["GREEN", "YELLOW", "RED"];
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(next);
  };

  // Show first 5 online users as avatars
  const avatarUsers = onlineUsers.slice(0, 5);

  return (
    <div
      className="flex flex-col items-center w-[56px] py-3 flex-shrink-0"
      style={{
        background: DARK.BG,
        borderRight: `1px solid ${DARK.BORDER_LT}`,
      }}
    >
      {/* Mode orb */}
      <div className="mb-4" onClick={cycleMode}>
        <GlowingOrb mode={mode} size={30} breathing />
      </div>

      {/* Online user avatars */}
      <div className="flex-1 flex flex-col items-center gap-1.5 overflow-hidden">
        {avatarUsers.map((user) => (
          <div
            key={user.user_id}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold relative"
            style={{
              background: DARK.BG_RAISED,
              border: `1px solid ${DARK.BORDER}`,
              color: DARK.TEXT_DIM,
            }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
            <div className="absolute -bottom-0.5 -right-0.5">
              <StatusOrb mode={user.mode} size="sm" />
            </div>
          </div>
        ))}
      </div>

      {/* Nav buttons */}
      <div className="flex flex-col items-center gap-0.5 mt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.key;
          const badge = item.key === "messages" ? unreadCount : 0;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="flex flex-col items-center justify-center w-[52px] py-1.5 rounded cursor-pointer relative"
              style={{
                background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                borderLeft: isActive ? `2px solid ${DARK.ACCENT}` : "2px solid transparent",
                border: "none",
              }}
              title={item.label}
            >
              <span className="text-[14px]">{item.icon}</span>
              {badge > 0 && (
                <span
                  className="absolute top-0.5 right-1 text-[8px] font-bold rounded-full px-1"
                  style={{ background: DARK.DANGER, color: "white", lineHeight: "12px" }}
                >
                  {badge}
                </span>
              )}
              <span
                className="text-[8px] font-bold tracking-[0.5px]"
                style={{ color: isActive ? DARK.ACCENT_LT : DARK.TEXT_FAINT }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
