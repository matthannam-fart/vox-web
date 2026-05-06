## Summary

<!-- 1–2 sentences on what + why. -->

## Cross-client parity

If this PR touches any of the following, **update both vox-mac and vox-web** (see [PARITY.md](../PARITY.md)):

- [ ] Relay wire protocol (`Sources/Vox/Models/PresenceMessages.swift` ↔ `src/types/index.ts`)
- [ ] Supabase RPC function signatures (`join_team_by_code`, `find_team_by_invite_code`, …)
- [ ] RLS policies (migration applied + both clients tested)
- [ ] Storage bucket paths or mime types
- [ ] Invite-code format / status mode names / placeholder strings
- [ ] Feature parity matrix row state
- [ ] `scripts/check-parity.sh` passes locally

If none of the above apply, mark N/A.

If this change is paired with a PR in the sister repo, link it:
`paired with matthannam-fart/vox-web#<n>`

## Test plan

- [ ] …
