import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useTeamStore } from "../stores/teamStore";
import { useSettingsStore } from "../stores/settingsStore";
import { CreateTeamDialog } from "../components/CreateTeamDialog";
import { DARK, COLORS } from "../lib/theme";

interface TeamsPageProps {
  onNavigate: (page: "users" | "welcome") => void;
}

export const TeamsPage = ({ onNavigate }: TeamsPageProps) => {
  const { userId } = useAuthStore();
  const { teams, loading, loadMyTeams, leaveTeam, joinTeamByCode } = useTeamStore();
  const { activeTeamId, activeTeamName, setActiveTeam } = useSettingsStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");

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

  const formatCode = (val: string) =>
    val.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase().slice(0, 10);

  useEffect(() => {
    if (userId) loadMyTeams(userId);
  }, [userId, loadMyTeams]);

  const handleSelectTeam = (teamId: string, teamName: string) => {
    setActiveTeam(teamId, teamName);
    onNavigate("users");
  };

  const handleLeave = async () => {
    if (!activeTeamId || !userId) return;
    await leaveTeam(activeTeamId, userId);
    setActiveTeam(null, null);
    setConfirmLeave(false);
    onNavigate("welcome");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Team list */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5">
        {loading && (
          <p className="text-[11px] p-3 text-center" style={{ color: DARK.TEXT_DIM }}>
            Loading...
          </p>
        )}
        {teams.map((team) => {
          const isActive = team.id === activeTeamId;
          return (
            <div
              key={team.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-md mb-1 cursor-pointer"
              style={{
                background: isActive ? "rgba(0, 166, 81, 0.08)" : DARK.BG_RAISED,
                border: `1px solid ${isActive ? "rgba(0, 166, 81, 0.3)" : DARK.BORDER}`,
              }}
              onClick={() => !isActive && handleSelectTeam(team.id, team.name)}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold truncate"
                  style={{ color: DARK.TEXT }}
                >
                  {team.name}
                </p>
                {isActive && team.invite_code && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(team.invite_code);
                    }}
                    className="text-[10px] mt-0.5 cursor-pointer bg-transparent border-none"
                    style={{ color: DARK.ACCENT }}
                  >
                    &#128203; {team.invite_code}
                  </button>
                )}
              </div>
              {isActive ? (
                <span className="text-[10px] font-bold" style={{ color: COLORS.GREEN }}>
                  &#10003;
                </span>
              ) : (
                <span className="text-[10px]" style={{ color: DARK.TEXT_FAINT }}>
                  Select
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div
        className="px-2.5 py-2.5 flex flex-col gap-2"
        style={{ borderTop: `1px solid ${DARK.BORDER_LT}` }}
      >
        <button
          onClick={() => setShowCreateDialog(true)}
          className="w-full rounded-[6px] py-2 text-[13px] font-medium cursor-pointer"
          style={{
            background: DARK.BG_RAISED,
            border: `1px solid ${DARK.BORDER}`,
            color: DARK.TEXT,
          }}
        >
          + Create Team
        </button>

        {/* Join by code */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="VOX-XXXXX"
            maxLength={10}
            value={inviteCode}
            onChange={(e) => setInviteCode(formatCode(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
            className="flex-1 rounded-[6px] px-2 py-1.5 text-[11px] text-center tracking-[1.5px] outline-none"
            style={{
              background: DARK.BG_RAISED,
              border: `1px solid ${DARK.BORDER}`,
              color: DARK.TEXT,
            }}
          />
          <button
            onClick={handleJoinByCode}
            disabled={!inviteCode.trim()}
            className="rounded-[6px] px-3 py-1.5 text-[11px] font-bold cursor-pointer disabled:opacity-50"
            style={{ background: DARK.ACCENT, color: "white", border: "none" }}
          >
            Join
          </button>
        </div>
        {joinError && (
          <p className="text-[10px] text-center" style={{ color: DARK.DANGER }}>
            {joinError}
          </p>
        )}

        {activeTeamId && (
          confirmLeave ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 rounded-[6px] py-1.5 text-[11px] cursor-pointer"
                style={{
                  background: "transparent",
                  border: `1px solid ${DARK.BORDER}`,
                  color: DARK.TEXT_DIM,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 rounded-[6px] py-1.5 text-[11px] font-semibold cursor-pointer"
                style={{
                  background: "transparent",
                  border: `1px solid rgba(229, 57, 53, 0.3)`,
                  color: DARK.DANGER,
                }}
              >
                Confirm Leave
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="w-full rounded-[6px] py-1.5 text-[11px] font-medium cursor-pointer"
              style={{
                background: "transparent",
                border: `1px solid rgba(229, 57, 53, 0.3)`,
                color: DARK.DANGER,
              }}
            >
              Leave {activeTeamName ?? "Team"}
            </button>
          )
        )}
      </div>

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
