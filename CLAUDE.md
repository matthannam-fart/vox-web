# Vox Web Client

Web client for Vox, a push-to-talk team intercom. Runs alongside the existing desktop app (Python/PySide6) — both connect to the same relay server and Supabase backend.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- Supabase JS (`@supabase/supabase-js`) for auth and team data
- simple-peer (WebRTC wrapper) for audio
- WebSocket for relay presence

## Architecture

```
src/
├── components/       # UI components (UserRow, StatusBadge, GlowingOrb, etc.)
├── hooks/            # Custom hooks (useAuth, usePresence, useAudio, useWebRTC)
├── lib/              # Supabase client, WebSocket presence client, WebRTC manager
├── pages/            # Login, Lobby, TeamView, Settings
├── stores/           # Zustand stores (auth, presence, call, settings)
└── types/            # Shared TypeScript types
```

## Key Design Decisions

- **WebRTC for audio** — browser-native echo cancellation, jitter buffering, codec negotiation. Do NOT port the Python NLMS echo canceller or jitter buffer.
- **WebSocket for presence** — connects to the relay server's WSS endpoint. Same JSON protocol as desktop TCP presence, different transport.
- **Zustand for state** — mirrors the centralized IntercomApp state hub in the desktop app's main.py.
- **No LAN discovery** — web clients always use the relay. Zeroconf/mDNS is not available in browsers.
- **PWA-first** — installable via browser, service worker for offline shell. Tauri wrapper is a later phase.

## Related Codebase

The desktop app lives in `../vox-main/`. Key files to reference:

- `relay_server.py` — the server this client connects to (needs WSS addition)
- `config.py` — ports, relay host, Supabase config
- `network_manager.py` — presence protocol (REGISTER, MODE_UPDATE, PING/PONG)
- `supabase_client.py` — REST endpoints for teams, profiles, join requests
- `auth_manager.py` — auth flows (email/password, Google OAuth PKCE, magic link)
- `ui_constants.py` — color palette, mode labels

## Backend Config

```
Relay: relay.ohinter.com:50002 (TCP+UDP, adding WSS)
Supabase: https://kfxiawqlboqnwzkxbyid.supabase.co
Supabase anon key: sb_publishable_5zTaoo3rYTDpXv0gHN0c8g_PEkHyXIO
```

## Conventions

- Use functional components with hooks (no class components)
- Prefer named exports
- Co-locate component styles (Tailwind classes inline)
- Types go in `src/types/` when shared, co-located when component-specific
- Test files live next to their source: `Component.tsx` → `Component.test.tsx`
- Use `const` by default, `let` only when reassignment is needed
