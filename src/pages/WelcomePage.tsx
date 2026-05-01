import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useTeamStore } from "../stores/teamStore";
import { useSettingsStore } from "../stores/settingsStore";
import { CreateTeamDialog } from "../components/CreateTeamDialog";
import { DARK, COLORS } from "../lib/theme";

interface WelcomePageProps {
  onNavigate: (page: "users" | "settings") => void;
}

export const WelcomePage = ({ onNavigate }: WelcomePageProps) => {
  const { userId } = useAuthStore();
  const { teams, loading, error, loadMyTeams, joinTeamByCode } = useTeamStore();
  const { activeTeamId, setActiveTeam } = useSettingsStore();
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (userId) loadMyTeams(userId);
  }, [userId, loadMyTeams]);

  // Pre-fill invite code from `?code=…` so beta-tester invite links land in the box.
  // Also restore from sessionStorage in case the user signed in via OAuth/magic-link
  // (which strips query params during the auth round-trip).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("code");
    const fromStorage = sessionStorage.getItem("vox-pending-invite");
    const code = fromUrl ?? fromStorage;
    if (code) {
      setInviteCode(code.toUpperCase().slice(0, 10));
      sessionStorage.removeItem("vox-pending-invite");
    }
  }, []);

  const handleSelectTeam = (teamId: string, teamName: string) => {
    setActiveTeam(teamId, teamName);
    onNavigate("users");
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim() || !userId) return;
    setJoinError("");
    const team = await joinTeamByCode(inviteCode.trim(), userId);
    if (team) {
      setActiveTeam(team.id, team.name);
      setInviteCode("");
      onNavigate("users");
    } else {
      setJoinError("No team found for that code");
    }
  };

  const formatCode = (val: string) => {
    // Auto-format: keep alphanumeric and dashes, uppercase, max 10 chars
    return val.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase().slice(0, 10);
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-4 overflow-hidden">
      {/* Gear icon */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => onNavigate("settings")}
          className="w-9 h-9 flex items-center justify-center rounded-md text-base cursor-pointer"
          style={{ background: "transparent", border: "none", color: DARK.TEXT_DIM }}
        >
          &#9881;
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold" style={{ color: DARK.TEXT }}>
          Vox
        </h1>
        <p className="text-[11px] mt-1" style={{ color: DARK.TEXT_DIM }}>
          Welcome to Vox
        </p>
      </div>

      {/* Teams header */}
      <label
        className="block text-[9px] font-bold uppercase tracking-[1.5px] mb-2"
        style={{ color: DARK.TEXT_FAINT }}
      >
        Teams
      </label>

      {/* Team list */}
      <div
        className="overflow-y-auto mb-3 rounded-md"
        style={{ maxHeight: 140, border: `1px solid ${DARK.BORDER_LT}` }}
      >
        {loading && (
          <p className="text-[11px] p-3 text-center" style={{ color: DARK.TEXT_DIM }}>
            Loading teams...
          </p>
        )}
        {!loading && teams.length === 0 && (
          <p
            className="text-[11px] p-3 text-center whitespace-pre-line"
            style={{ color: DARK.TEXT_FAINT }}
          >
            {"No teams yet.\nCreate one or join with an invite code."}
          </p>
        )}
        {teams.map((team) => {
          const isActive = team.id === activeTeamId;
          return (
            <div
              key={team.id}
              className="flex items-center justify-between px-3 py-2"
              style={{
                background: isActive ? "rgba(0, 166, 81, 0.08)" : "transparent",
                borderLeft: isActive ? `3px solid ${COLORS.GREEN}` : "3px solid transparent",
              }}
            >
              <span
                className="text-[13px] font-semibold truncate"
                style={{ color: DARK.TEXT }}
              >
                {team.name}
              </span>
              {isActive ? (
                <span className="text-[10px] font-bold" style={{ color: COLORS.GREEN }}>
                  &#10003;
                </span>
              ) : (
                <button
                  onClick={() => handleSelectTeam(team.id, team.name)}
                  className="text-[10px] font-bold px-3 py-1 rounded cursor-pointer"
                  style={{
                    background: COLORS.GREEN,
                    color: "white",
                    border: "none",
                  }}
                >
                  Select
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Create team */}
      <button
        onClick={() => setShowCreateDialog(true)}
        className="w-full rounded-[6px] py-[7px] text-[11px] font-semibold cursor-pointer mb-3"
        style={{ background: DARK.TEAL, color: "white", border: "none" }}
      >
        + Start a Team
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px" style={{ background: DARK.BORDER }} />
        <span className="text-[10px]" style={{ color: DARK.TEXT_FAINT }}>
          or join with code
        </span>
        <div className="flex-1 h-px" style={{ background: DARK.BORDER }} />
      </div>

      {/* Invite code input */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="VOX-XXXXX"
          maxLength={10}
          value={inviteCode}
          onChange={(e) => setInviteCode(formatCode(e.target.value))}
          className="flex-1 rounded-[6px] px-2.5 py-[7px] text-xs text-center tracking-[2px] outline-none"
          style={{
            background: DARK.BG_RAISED,
            border: `1px solid ${DARK.BORDER}`,
            color: DARK.TEXT,
          }}
        />
        <button
          onClick={handleJoinByCode}
          disabled={!inviteCode.trim()}
          className="rounded-[6px] px-4 py-[7px] text-[11px] font-bold cursor-pointer disabled:opacity-50"
          style={{ background: DARK.ACCENT, color: "white", border: "none" }}
        >
          Join
        </button>
      </div>

      {/* Errors */}
      {(joinError || error) && (
        <p className="text-[11px] text-center" style={{ color: DARK.DANGER }}>
          {joinError || error}
        </p>
      )}

      {showCreateDialog && (
        <CreateTeamDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={(teamId, teamName) => {
            setShowCreateDialog(false);
            setActiveTeam(teamId, teamName);
            onNavigate("users");
          }}
        />
      )}
    </div>
  );
};
