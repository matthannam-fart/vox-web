# Vox Client Parity Contract

Vox has two clients — **vox-mac** (Swift/SwiftUI) and **vox-web** (React/TS) — that share a single Supabase project (`kfxiawqlboqnwzkxbyid`) and a single relay protocol (`relay.getvox.net:50003`). They MUST stay in sync on the items below or features silently break.

**This document is duplicated identically in both repos.** A diverging copy is a bug — `scripts/check-parity.sh` enforces hash equality. Any change to a contract item below requires a matching change in **both client repos** and (where relevant) a Supabase migration.

When you don't know if your change crosses the contract: it probably does. Read on.

---

## Server contracts (Supabase, single source of truth)

These live in the Supabase project `kfxiawqlboqnwzkxbyid` and are committed as migrations. Both clients consume them.

### RPC functions

| Function | Purpose | Web caller | Mac caller |
|---|---|---|---|
| `join_team_by_code(code text)` | Lookup + insert membership atomically (bypasses RLS so non-members can join) | `src/stores/teamStore.ts → joinTeamByCode` | `Sources/Vox/Auth/TeamStore.swift → joinTeamByCode` |
| `find_team_by_invite_code(code text)` | Returns id + name only, used by the request-to-join flow | `src/stores/teamStore.ts → findTeamByCode` *(if present)* | `Sources/Vox/Auth/TeamStore.swift → findTeamByCode` |
| `is_member_of(team_uuid)` / `is_admin_of(team_uuid)` | RLS-internal helpers — clients should NOT call directly | — | — |
| `generate_invite_code()` | Default value for `teams.invite_code` — produces `VX` + 5 unambiguous chars with collision retry | — | — |

### RLS expectations

- **`teams`**: SELECT requires membership OR ownership; INSERT requires `created_by = auth.uid()`; UPDATE/DELETE admin-only.
- **`team_members`**: SELECT requires membership; INSERT only via `join_team_by_code` RPC OR creator-self-admin OR admin-adds-member; UPDATE admin-only; DELETE self-or-admin.
- **`join_requests`**: requester sees own; admins see team's; INSERT must be `requester_id = auth.uid()`; UPDATE admin-only; DELETE requester-or-admin.
- **`voicemails`**: sender + recipient can SELECT; INSERT needs `sender_id = auth.uid()` AND both parties on the same team; UPDATE recipient-only (mark played); DELETE sender-or-recipient.
- **`profiles`**: SELECT open to authenticated; INSERT/UPDATE only own.
- The `anon` role has **zero grants** on Vox tables. All Vox functionality requires sign-in.

### Storage

- `voicemails` bucket: private; 5 MB cap; allowed mime types: `audio/m4a`, `audio/mp4`, `audio/aac`, `audio/webm`, `audio/webm;codecs=opus`, `audio/ogg`.
- Object key convention: `<sender_id_lowercase>/<voicemail_uuid>.<ext>`. Storage RLS verifies `lower((storage.foldername(name))[1]) = auth.uid()::text` (case-insensitive so Swift's uppercase `UUID.uuidString` works).
- Reads require an existing `voicemails` row referencing the path. Playback uses 5-minute signed URLs.

---

## Relay wire protocol (`wss://relay.getvox.net:50003`)

JSON over WebSocket, snake_case field names.

**Outbound** (client → relay): `REGISTER`, `MODE_UPDATE`, `PING`, `CALL_REQUEST`, `CALL_ACCEPT`, `CALL_DECLINE`, `CALL_END`, `WEBRTC_SIGNAL`.

**Inbound** (relay → client): `PRESENCE_UPDATE`, `REGISTERED`, `PONG`, `INCOMING_CALL`, `CALL_ACCEPTED`, `CALL_DECLINED`, `CALL_ENDED`, `WEBRTC_SIGNAL`, `ERROR`.

Canonical Swift definition: `vox-mac/Sources/Vox/Models/PresenceMessages.swift`.
Canonical TS definition: `vox-web/src/types/index.ts` (`PresenceOutMessage` / `PresenceInMessage`).

Adding or changing a message type requires updating **all three** of:
1. `vox-mac/Sources/Vox/Models/PresenceMessages.swift`
2. `vox-web/src/types/index.ts`
3. The Python relay (`vox/relay_server.py`)

The mac repo has unit tests in `Tests/VoxTests/PresenceMessagesTests.swift` that lock the wire format. Update them when shapes change.

---

## UI conventions

| Concept | Value |
|---|---|
| Invite code format | `VX` + 5 unambiguous chars (no `I` / `O` / `0` / `1`), no dash |
| Placeholder hint | `VXABC12` (both clients' join field) |
| Status modes (wire) | `GREEN` / `YELLOW` / `RED` (uppercase) |
| Status mode labels | `AVAIL` / `BUSY` / `DND` |
| PTT default hotkey | backtick (`` ` ``); user-rebindable on mac |
| BUSY-mode interaction | Caller records voicemail instead of opening a call |
| Same-account dedup | Each client filters self out of presence list |

---

## Feature parity matrix

✅ shipped • 🚧 partial • ❌ missing • — not applicable.

| Feature | vox-mac | vox-web | Owner |
|---|---|---|---|
| Sign in (Google + magic link) | ✅ | ✅ | Supabase auth |
| Teams (create / join / leave) | ✅ | ✅ | RLS + RPC |
| Join requests (admin approval) | ✅ | 🚧 (banner exists, not wired) | RLS + UI |
| WebRTC P2P calls | ✅ | ✅ | relay + simple-peer |
| Push-to-talk | ✅ (configurable global hotkey) | ✅ (in-app button only) | local |
| Voicemails (record + inbox) | ✅ | ✅ | Storage + RLS |
| NTS Radio | ✅ | ✅ | independent |
| Stream Deck integration | ✅ (local WS server + bundled plugin) | — (browser doesn't expose Stream Deck) | local |
| Dark / Light / System theme | ✅ | 🚧 (Dark + Light toggle, no System) | client |
| Output device routing | ✅ (CoreAudio default swap) | — (browser handles) | local |
| Realtime updates (vs polling) | ❌ (15–20 s polling) | ❌ (15–20 s polling) | tbd |
| Open mic mode | ❌ | ❌ | tbd |

When a row flips state, update **this file in both repos** in the same change set.

---

## Process

Any PR that touches a contract item above MUST:

1. **Update this file in both repos** with the new state, OR explicitly carve an exception (rare; document why).
2. Reference the sister PR in the description, e.g. `paired with matthannam-fart/vox-web#42`.
3. Pass `scripts/check-parity.sh` locally before pushing. CI runs it on every PR.

The PR template at `.github/pull_request_template.md` carries the cross-client checklist as a reminder.
