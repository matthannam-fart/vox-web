# Vox — Relay Server Deployment Guide

The web client needs a WebSocket endpoint on the relay server. This guide walks through setting up SSH access from Matt's Air and deploying the updated relay.

## Step 1: Generate SSH Key (on Matt's Air)

```bash
ssh-keygen -t ed25519 -C "matthannam@Matts-Air" -f ~/.ssh/id_ed25519 -N ""
```

Then copy the public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

## Step 2: Add Key to Relay Server (DigitalOcean)

1. Go to **digitalocean.com** and log in
2. Navigate to **Droplets** → find the relay droplet (relay.ohinter.com)
3. Click **Console** (opens a web-based terminal)
4. In the console, paste this (replacing `YOUR_KEY` with the output from Step 1):

```bash
echo "YOUR_KEY" >> ~/.ssh/authorized_keys
```

5. Verify it worked — back on Matt's Air:
```bash
ssh root@relay.ohinter.com "echo connected"
```

## Step 3: Install websockets on the Server

```bash
ssh root@relay.ohinter.com "pip3 install websockets"
```

## Step 4: Open Port 50003 for WebSocket

```bash
ssh root@relay.ohinter.com "ufw allow 50003 && ufw status"
```

## Step 5: Deploy Updated relay_server.py

Option A — SCP from local:
```bash
scp ~/projects/vox-main/relay_server.py root@relay.ohinter.com:~/relay_server.py
```

Option B — Pull from GitHub (if pushed):
```bash
ssh root@relay.ohinter.com "cd /root && curl -sL https://raw.githubusercontent.com/matthannam-fart/vox/main/relay_server.py -o relay_server.py"
```

## Step 6: Restart the Relay

```bash
ssh root@relay.ohinter.com "pkill -f relay_server.py; VOX_RELAY_KEY='vox-relay-v1-2026' nohup python3 relay_server.py --ws-port 50003 > relay.log 2>&1 &"
```

## Step 7: Verify

```bash
# Check it's running
ssh root@relay.ohinter.com "pgrep -a relay"

# Check logs — should see both TCP and WSS listeners
ssh root@relay.ohinter.com "tail -20 /root/relay.log"

# Expected output:
# [Server] Vox Relay listening on 0.0.0.0:50002
# [WSS] WebSocket server listening on 0.0.0.0:50003
# [Server] Ready on TCP:50002 + WSS:50003
```

## Step 8: Test the Web Client

```bash
cd ~/projects/vox-web
npm run dev
# Open http://localhost:3000 (or 3001 if 3000 is taken)
```

1. Log in with your Supabase account
2. Select a team
3. The status bar should show "Connected"
4. Open a second browser tab — both should see each other in the user list

## What Changed

The relay server now has a `--ws-port` flag (default 50003) that runs a WebSocket server alongside the existing TCP server on port 50002. Both client types (desktop TCP and web WebSocket) share the same presence system — they see each other in the team roster.

### New relay_server.py features:
- `ClientConnection` wrapper — abstracts TCP vs WebSocket sends
- `handle_ws_client()` — async WebSocket presence handler
- `WEBRTC_SIGNAL` forwarding — routes WebRTC signaling between web clients
- Message translation — maps between web and desktop field names
- Cross-platform call blocking — web↔desktop audio calls not yet supported (different transport)

## Troubleshooting

**"Permission denied (publickey)"** → Step 2 wasn't done, or the key wasn't pasted correctly. Use DigitalOcean Console to fix.

**Web client shows "Disconnected"** → Port 50003 isn't open (Step 4), or relay isn't running with `--ws-port` (Step 6).

**"websockets not installed"** → Step 3 was skipped. SSH in and run `pip3 install websockets`.

**Desktop app stopped working** → The TCP server on 50002 is unchanged. If desktop broke, check `relay.log` for errors. The `ClientConnection` wrapper might have a bug — revert to the previous `relay_server.py` as a fallback.

## Quick Reference

| What | Command |
|------|---------|
| Check relay status | `ssh root@relay.ohinter.com "pgrep -a relay"` |
| View logs | `ssh root@relay.ohinter.com "tail -50 /root/relay.log"` |
| Restart relay | `ssh root@relay.ohinter.com "pkill -f relay_server.py; VOX_RELAY_KEY='vox-relay-v1-2026' nohup python3 relay_server.py --ws-port 50003 > relay.log 2>&1 &"` |
| Start web client | `cd ~/projects/vox-web && npm run dev` |
