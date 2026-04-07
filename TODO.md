# Vox Web — TODO

Picking back up from the audio testing phase.

## Where we left off

The web client is fully deployed and presence is working end-to-end. Two web clients can see each other in the team roster. Calls connect and audio meters work, but the **PTT button just got changed to mute/unmute mode** and we haven't verified the mic actually transmits when held yet.

## Live URLs

- **Web client (production):** https://vox-web-770.netlify.app
- **Web client (Netlify admin):** https://app.netlify.com/projects/vox-web-770
- **Relay server:** wss://relay.ohinter.com:50003 (TCP 50002 for desktop)
- **Supabase:** https://kfxiawqlboqnwzkxbyid.supabase.co

## Active issues

### 1. Verify PTT mic transmission ⚠️ in progress

The PTT button was just refactored to mute/unmute during active calls. Need to test:

1. Open https://vox-web-770.netlify.app in two tabs (or laptop + phone)
2. Log in on both, join the same team
3. Click a user → hold PTT → call starts (mic muted by default)
4. Other tab gets the incoming call automatically (no UI prompt yet — calls auto-connect)
5. Hold PTT — MIC level meter should move on the talker side, audio plays on the receiver
6. Release PTT — MIC mutes again

If audio doesn't transmit when held, check `useWebRTC.ts:muteMic`/`unmuteMic` — they toggle `track.enabled` on the existing mic stream from the call.

### 2. Remove debug text from status bar

`src/pages/UsersPage.tsx` has temporary debug text showing `sel: <id>` and `X online / Y total`. Remove once everything works.

### 3. Incoming call UX

Currently, when one user calls another, the receiver auto-accepts (no banner). The `IncomingCallBanner` component exists but the flow doesn't trigger it correctly because the call state for the receiver is set by the `INCOMING_CALL` message which then immediately gets `CALL_ACCEPTED` from somewhere. Need to:

- Receiver should see the `IncomingCallBanner` with Accept/Decline buttons
- Only on accept should `acceptCall` fire and create the WebRTC peer
- Currently `useWebRTC.ts:handleAcceptCall` is wired but never called from the UI

### 4. PTT during pre-call state

The button currently has two modes:
- **No active call:** "Hold to call [name]" — press starts a call, release ends it
- **In active call:** "Hold to talk to [name]" — press unmutes, release mutes

The "press to start call, release to end" mode is broken — you can't hold long enough to talk before the release ends the call. Either:
- Auto-connect on click and use PTT only as mute toggle (recommended — matches desktop)
- Or buffer the PTT-down state until the call connects, then start unmuted

### 5. End call button

The CallBanner has an "End" button but no UI to start a fresh call after ending one. After ending, the user needs to click another user and hold PTT again. This works, just confirm the flow.

## Deferred tasks

### TLS for relay (DONE ✅)
Already running with Let's Encrypt cert at `/etc/letsencrypt/live/relay.ohinter.com/`. Restarted with `--cert` and `--key` flags.

### PWA icons
Currently upscaled from `oh_logo.png` (240x240). Should be sharper. Source a higher-res Vox logo or generate from SVG.

### Service worker / offline support
PWA manifest works but no service worker. Add `vite-plugin-pwa` to cache the app shell.

### Code splitting
Build warns about 500kb+ bundle. Lazy-load `simple-peer` and the WebRTC code with dynamic imports.

### Cross-platform calls
Web ↔ desktop calls are blocked at the relay level (different transports — desktop uses UDP relay, web uses WebRTC). Future work: bridge the two via a server-side WebRTC proxy.

### Linter cleanup
A few `eslint-disable` comments and `_props` workarounds in `App.tsx`, `RadioPage.tsx`. Auto-lint hook is set up at `~/.claude/settings.json` and runs ESLint --fix + ruff format on save.

## Quick reference

### Restart relay server
```bash
ssh root@relay.ohinter.com "fuser -k 50002/tcp 50003/tcp 2>/dev/null; sleep 2; export VOX_RELAY_KEY='vox-relay-v1-2026' && nohup python3 -u /root/relay_server.py --ws-port 50003 --cert /etc/letsencrypt/live/relay.ohinter.com/fullchain.pem --key /etc/letsencrypt/live/relay.ohinter.com/privkey.pem > /root/relay.log 2>&1 &"
```

### Check relay logs
```bash
ssh root@relay.ohinter.com "tail -30 /root/relay.log"
```

### Deploy web client
```bash
cd ~/projects/vox-web && npm run build && netlify deploy --prod --dir=dist
```

### Local dev
```bash
cd ~/projects/vox-web && npm run dev
# Opens at http://localhost:3001/
```

## Architecture notes

- **Auth:** Supabase (email/password, Google OAuth, magic link). OAuth redirect URL `https://vox-web-770.netlify.app` is registered in Supabase auth settings.
- **Presence:** WebSocket to `wss://relay.ohinter.com:50003`. Auth key `vox-relay-v1-2026` hardcoded as default.
- **Audio:** WebRTC via `simple-peer`. Browser handles codec, AEC, jitter buffer. Signaling goes through the presence WebSocket as `WEBRTC_SIGNAL` messages.
- **State:** Zustand stores — `authStore`, `teamStore`, `presenceStore`, `settingsStore`. The `presenceStore` has a `setWebRTCSignalHandler` callback that `useWebRTC` registers to receive incoming WebRTC signals.
- **Cross-platform block:** The relay's `handle_ws_client` checks `target.client_type` and rejects calls to non-web users.

## Files most likely to need changes

| File | What's there |
|------|--------------|
| `src/hooks/useWebRTC.ts` | PTT mute/unmute, call lifecycle |
| `src/pages/UsersPage.tsx` | PTT button wiring, debug status bar |
| `src/components/PTTButton.tsx` | Hold-to-talk button with isInCall mode |
| `src/components/IncomingCallBanner.tsx` | Accept/decline UI (not currently triggered) |
| `~/projects/vox-main/relay_server.py` | WSS endpoint, presence broadcast |
