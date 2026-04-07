import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface TeamInfo {
  id: string;
  name: string;
  invite_code: string;
  role: "admin" | "member";
}

interface TeamMemberInfo {
  user_id: string;
  display_name: string;
  role: "admin" | "member";
}

interface TeamState {
  teams: TeamInfo[];
  teamMembers: TeamMemberInfo[];
  loading: boolean;
  error: string | null;

  loadMyTeams: (userId: string) => Promise<void>;
  createTeam: (name: string, creatorId: string) => Promise<TeamInfo | null>;
  joinTeamByCode: (code: string, userId: string) => Promise<TeamInfo | null>;
  getTeamMembers: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string, userId: string) => Promise<void>;
  submitJoinRequest: (teamId: string, userId: string) => Promise<boolean>;
  approveJoinRequest: (requestId: string, teamId: string, requesterId: string, adminId: string) => Promise<boolean>;
  declineJoinRequest: (requestId: string, adminId: string) => Promise<boolean>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  teamMembers: [],
  loading: false,
  error: null,

  loadMyTeams: async (userId) => {
    set({ loading: true, error: null });
    // PostgREST embedded join: team_members → teams (matches supabase_client.py)
    const { data, error } = await supabase
      .from("team_members")
      .select("role, teams(id, name, invite_code)")
      .eq("user_id", userId);

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    const teams: TeamInfo[] = (data ?? [])
      .filter((row: Record<string, unknown>) => row.teams)
      .map((row: Record<string, unknown>) => {
        const team = row.teams as Record<string, string>;
        return {
          id: team.id,
          name: team.name,
          invite_code: team.invite_code ?? "",
          role: (row.role as "admin" | "member") ?? "member",
        };
      });

    set({ teams, loading: false });
  },

  createTeam: async (name, creatorId) => {
    set({ error: null });
    // 1. Insert team
    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .insert({ name, created_by: creatorId })
      .select()
      .single();

    if (teamError || !teamData) {
      set({ error: teamError?.message ?? "Failed to create team" });
      return null;
    }

    // 2. Add creator as admin
    await supabase
      .from("team_members")
      .insert({ team_id: teamData.id, user_id: creatorId, role: "admin" });

    const team: TeamInfo = {
      id: teamData.id,
      name: teamData.name,
      invite_code: teamData.invite_code ?? "",
      role: "admin",
    };

    set({ teams: [...get().teams, team] });
    return team;
  },

  joinTeamByCode: async (code, userId) => {
    set({ error: null });
    const trimmedCode = code.toUpperCase().trim();
    console.log("[teamStore] joinTeamByCode:", trimmedCode);

    // Look up team by invite code
    const { data: teams, error: lookupError } = await supabase
      .from("teams")
      .select("id, name, invite_code")
      .eq("invite_code", trimmedCode);

    console.log("[teamStore] lookup result:", { teams, lookupError });

    if (lookupError) {
      set({ error: `Lookup failed: ${lookupError.message}` });
      return null;
    }
    if (!teams || teams.length === 0) {
      set({ error: `No team found for code "${trimmedCode}"` });
      return null;
    }

    const teamData = teams[0];

    // Check if already a member
    const { data: existing } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamData.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      const { error: joinError } = await supabase
        .from("team_members")
        .insert({ team_id: teamData.id, user_id: userId, role: "member" });

      console.log("[teamStore] join result:", { joinError });

      if (joinError) {
        set({ error: `Join failed: ${joinError.message}` });
        return null;
      }
    } else {
      console.log("[teamStore] already a member");
    }

    const team: TeamInfo = {
      id: teamData.id,
      name: teamData.name,
      invite_code: teamData.invite_code ?? "",
      role: "member",
    };

    // Add to local list if not already there
    const existing = get().teams.find((t) => t.id === team.id);
    if (!existing) {
      set({ teams: [...get().teams, team] });
    }
    return team;
  },

  getTeamMembers: async (teamId) => {
    const { data, error } = await supabase
      .from("team_members")
      .select("role, user_id, profiles(id, display_name)")
      .eq("team_id", teamId);

    if (error || !data) {
      set({ teamMembers: [] });
      return;
    }

    const members: TeamMemberInfo[] = data
      .filter((row: Record<string, unknown>) => row.profiles)
      .map((row: Record<string, unknown>) => {
        const profile = row.profiles as Record<string, string>;
        return {
          user_id: profile.id,
          display_name: profile.display_name,
          role: (row.role as "admin" | "member") ?? "member",
        };
      });

    set({ teamMembers: members });
  },

  leaveTeam: async (teamId, userId) => {
    await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);

    set({ teams: get().teams.filter((t) => t.id !== teamId) });
  },

  submitJoinRequest: async (teamId, userId) => {
    // Clear any stale request first
    await supabase
      .from("join_requests")
      .delete()
      .eq("team_id", teamId)
      .eq("requester_id", userId);

    const { error } = await supabase
      .from("join_requests")
      .insert({ team_id: teamId, requester_id: userId, status: "pending" });

    if (error) {
      set({ error: error.message });
      return false;
    }
    return true;
  },

  approveJoinRequest: async (requestId, teamId, requesterId, adminId) => {
    const { error: patchError } = await supabase
      .from("join_requests")
      .update({ status: "approved", responded_by: adminId })
      .eq("id", requestId);

    if (patchError) return false;

    // Add to team_members
    await supabase
      .from("team_members")
      .upsert(
        { team_id: teamId, user_id: requesterId, role: "member" },
        { onConflict: "team_id,user_id" },
      );

    return true;
  },

  declineJoinRequest: async (requestId, adminId) => {
    const { error } = await supabase
      .from("join_requests")
      .update({ status: "declined", responded_by: adminId })
      .eq("id", requestId);

    return !error;
  },
}));
