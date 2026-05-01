# Vox Web Fix Instructions

Use this as a practical implementation checklist for hardening the Vox web client from prototype to reliable beta.

## Goal

Make the core web calling flow dependable:

1. A user can sign in, select or join a team, and see other online members.
2. A user can start a call with another web user.
3. The receiver gets a clear incoming call prompt and can accept or decline.
4. Once WebRTC connects, the UI moves from `connecting` to `connected`.
5. Push-to-talk unmutes only while held and mutes again on release.
6. Ending or losing a call cleans up both local media and remote UI state.

## Priority 1: Fix Call Lifecycle State

Files:

- `src/hooks/useWebRTC.ts`
- `src/lib/webrtc.ts`
- `src/stores/presenceStore.ts`
- `src/types/index.ts`
- `src/pages/UsersPage.tsx`

Instructions:

1. Wire `WebRTCManager.onConnect` in `useWebRTC.ts`.
2. Add a presence-store action such as `markCallConnected()` that changes `call.status` from `connecting` to `connected`.
3. Call that action when the `simple-peer` connection fires its `connect` event.
4. Decide what should happen on peer close or peer error. Do not leave the user stuck in `connecting` or `connected`.
5. Make `handleEndCall` the shared cleanup path for local end, remote close, and peer error, while avoiding double-cleanup loops.

Expected result:

- The call banner and user row visibly move to the live state once WebRTC connects.
- If WebRTC fails or closes, the UI returns to idle and the microphone stops.

## Priority 2: Replace Auto-Accept With Real Incoming Call UX

Files:

- `src/pages/UsersPage.tsx`
- `src/components/IncomingCallBanner.tsx`
- `src/stores/presenceStore.ts`
- `src/hooks/useWebRTC.ts`

Instructions:

1. Remove the auto-accept effect in `UsersPage.tsx`.
2. Show `IncomingCallBanner` while `call.status === "ringing"` for a call the current user did not initiate.
3. Only call `rtcAcceptCall` when the user presses Accept.
4. Call `rtcDeclineCall` when the user presses Decline.
5. Confirm the `roomCode` flow. If the receiver does not need to generate/pass a room code, remove the empty-string fallback and simplify the protocol. If it does need one, generate it intentionally before sending `CALL_ACCEPT`.

Expected result:

- Incoming calls do not silently connect.
- Accept and Decline both produce predictable UI changes on both clients.

## Priority 3: Make End Call Remote-Aware

Files:

- `src/types/index.ts`
- `src/lib/presence.ts`
- `src/stores/presenceStore.ts`
- `src/hooks/useWebRTC.ts`

Instructions:

1. Add a call-ended message to the presence protocol, for example:

   ```ts
   | { type: "CALL_END"; target_user_id: string }
   ```

   and the matching inbound message:

   ```ts
   | { type: "CALL_ENDED"; from_user_id: string }
   ```

2. Send `CALL_END` from `endCall()` when there is an active peer.
3. Handle `CALL_ENDED` by cleaning up local WebRTC/audio state and resetting `call` to idle.
4. Coordinate with the relay server if it does not already support this message.

Expected result:

- If one person ends the call, the other person is not left in a stale call state.

## Priority 4: Fix PTT Behavior

Files:

- `src/pages/UsersPage.tsx`
- `src/components/PTTButton.tsx`
- `src/hooks/useWebRTC.ts`
- `src/hooks/useAudio.ts`

Recommended behavior:

- Clicking a user starts the call.
- PTT only controls mute/unmute once the call is connecting or connected.
- Microphone starts muted by default.
- Holding PTT unmutes.
- Releasing PTT mutes again.

Instructions:

1. Remove the "hold to call, release to end" behavior unless it is explicitly desired.
2. Disable or relabel PTT while no user is selected or no call is active.
3. Make sure `unmuteMic()` works with the same stream that is attached to the peer connection.
4. Keep mic tracks disabled by default immediately after `getUserMedia`.

Expected result:

- Users do not accidentally start and immediately end a call before audio can connect.

## Priority 5: Make Settings Real

Files:

- `src/pages/SettingsPage.tsx`
- `src/stores/settingsStore.ts`
- `src/stores/authStore.ts`
- `src/stores/presenceStore.ts`
- `src/hooks/useAudio.ts`

Instructions:

1. Display name:
   - Save the display name to Supabase `profiles`, not just local storage.
   - Update presence name after saving.

2. Incognito:
   - Send incognito state to the relay if the relay supports it.
   - If unsupported, hide the toggle until the backend supports it.

3. Audio devices:
   - Persist selected input/output devices.
   - Pass selected input device into `getUserMedia`.
   - Apply selected output device with `HTMLMediaElement.setSinkId` where supported.

Expected result:

- Settings visibly affect runtime behavior and survive refreshes.

## Priority 6: Clean Up Build, Lint, and Bundle Health

Files:

- `src/components/PopoutButton.tsx`
- `eslint.config.js`
- `package.json`
- `vite.config.ts`

Instructions:

1. Fix the lint error in `PopoutButton.tsx` caused by synchronous `setState` inside an effect.
2. Remove temporary `console.log` calls or guard them behind a dev-only logger.
3. Remove unused `eslint-disable` comments where possible.
4. Code-split WebRTC/simple-peer so the initial bundle does not include all calling code.
5. Run dependency audit and decide whether to patch low/moderate advisories now or track them.

Verification:

```bash
npm run lint
npm run build
npm audit
```

Expected result:

- Lint passes.
- Production build passes.
- Bundle warning is reduced or intentionally accepted with a note.

## Priority 7: Add Minimal Tests

Suggested tooling:

- Vitest
- React Testing Library

Start with tests around:

1. Presence store call transitions:
   - idle to ringing
   - ringing to connecting
   - connecting to connected
   - connected to idle

2. PTT behavior:
   - press unmutes during active call
   - release mutes during active call
   - press does not start duplicate peers

3. Settings:
   - display name save updates the expected store/API path
   - selected audio device is passed to microphone request

Expected result:

- Core call-state regressions are caught before manual browser testing.

## Manual QA Checklist

Run these after implementation:

1. Start the local dev server.
2. Open two browser sessions with two different users.
3. Log both users in.
4. Join the same team.
5. Confirm both users appear online.
6. User A clicks User B.
7. User B sees an incoming call banner.
8. User B declines. Confirm User A returns to idle.
9. User A calls again.
10. User B accepts.
11. Confirm both clients show connected/live state.
12. Hold PTT on User A. Confirm User B hears audio.
13. Release PTT on User A. Confirm User A mutes.
14. Repeat from User B to User A.
15. End the call from User A. Confirm User B also returns to idle.
16. Refresh one client mid-call. Confirm the other client recovers cleanly.

## Security Review Notes

Before wider use, verify these outside this repo:

1. Supabase Row Level Security is enabled for:
   - `profiles`
   - `teams`
   - `team_members`
   - `join_requests`

2. Users cannot:
   - read teams they do not belong to except through valid invite flow
   - approve their own join requests as an admin
   - insert arbitrary team membership rows
   - update another user's profile

3. The relay does not trust the browser-provided relay key as real authentication. Use the Supabase session or a short-lived signed token if the relay needs authorization.

## Done Definition

This work is done when:

- `npm run lint` passes.
- `npm run build` passes.
- Two-browser manual call QA passes.
- Incoming calls require explicit accept/decline.
- End call clears both sides.
- PTT reliably mutes/unmutes during an active call.
- Settings either work end-to-end or unsupported controls are hidden.
