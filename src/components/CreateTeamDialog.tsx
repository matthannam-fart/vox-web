import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useTeamStore } from "../stores/teamStore";
import { DARK } from "../lib/theme";

interface CreateTeamDialogProps {
  onClose: () => void;
  onCreated: (teamId: string, teamName: string) => void;
}

export const CreateTeamDialog = ({ onClose, onCreated }: CreateTeamDialogProps) => {
  const { userId } = useAuthStore();
  const { createTeam } = useTeamStore();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !userId) return;
    setLoading(true);
    const team = await createTeam(name.trim(), userId);
    setLoading(false);
    if (team) {
      onCreated(team.id, team.name);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      {/* Dialog */}
      <div
        className="relative rounded-lg p-5 w-[220px]"
        style={{ background: DARK.BG_RAISED, border: `1px solid ${DARK.BORDER}` }}
      >
        <h2
          className="text-sm font-semibold mb-3"
          style={{ color: DARK.TEXT }}
        >
          Create Team
        </h2>
        <input
          type="text"
          placeholder="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
          className="w-full rounded-[6px] px-2.5 py-[7px] text-xs outline-none mb-3"
          style={{
            background: DARK.BG,
            border: `1px solid ${DARK.BORDER}`,
            color: DARK.TEXT,
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-[6px] py-[6px] text-[11px] font-medium cursor-pointer"
            style={{
              background: "transparent",
              border: `1px solid ${DARK.BORDER}`,
              color: DARK.TEXT_DIM,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex-1 rounded-[6px] py-[6px] text-[11px] font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: DARK.TEAL, color: "white", border: "none" }}
          >
            {loading ? "..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};
