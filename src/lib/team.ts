// Single source of truth for the invite URL builder + the multi-line share
// message. Mirrors `vox-mac/Sources/Vox/Models/Team.swift`'s `inviteURL` and
// `shareInviteMessage` extensions so the two clients can't drift on the
// format users see.

export interface TeamLike {
  name: string;
  invite_code: string;
}

export function inviteURL(team: TeamLike): string {
  return `https://app.getvox.net/?code=${team.invite_code}`;
}

export function shareInviteMessage(team: TeamLike): string {
  return [
    "Join me on Vox!",
    "",
    `Team: ${team.name}`,
    `Code: ${team.invite_code}`,
    "",
    `Open: ${inviteURL(team)}`,
  ].join("\n");
}
