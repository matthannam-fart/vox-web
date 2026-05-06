#!/usr/bin/env bash
# check-parity.sh — smoke-test that vox-mac and vox-web haven't drifted on
# the contracts in PARITY.md. Run from either repo root. Exits non-zero on
# drift so CI catches it. The checks are deliberately grep-based and
# conservative — false negatives are fine (humans review PARITY.md), false
# positives are not.
#
# Assumes both repos are cloned as siblings, e.g.:
#   ~/Projects/vox-mac
#   ~/Projects/vox-web
# Override via VOX_MAC and VOX_WEB env vars if your layout differs.

set -euo pipefail

THIS_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THIS_REPO_NAME="$(basename "$THIS_REPO_DIR")"

case "$THIS_REPO_NAME" in
  vox-mac|vox-web) ;;
  *)
    echo "check-parity.sh: expected to run from vox-mac or vox-web; got $THIS_REPO_NAME" >&2
    exit 2
    ;;
esac

VOX_MAC="${VOX_MAC:-$(dirname "$THIS_REPO_DIR")/vox-mac}"
VOX_WEB="${VOX_WEB:-$(dirname "$THIS_REPO_DIR")/vox-web}"

if [ ! -d "$VOX_MAC" ] || [ ! -d "$VOX_WEB" ]; then
  echo "check-parity.sh: need both vox-mac ($VOX_MAC) and vox-web ($VOX_WEB) on disk." >&2
  echo "Set VOX_MAC and VOX_WEB env vars if your clone layout is non-default." >&2
  exit 2
fi

fail=0
note() { printf "  %s\n" "$*"; }
header() { printf "── %s ──\n" "$*"; }

# 1) PARITY.md hash equality. Hard fail — the doc IS the contract.
header "PARITY.md hash"
if [ ! -f "$VOX_MAC/PARITY.md" ] || [ ! -f "$VOX_WEB/PARITY.md" ]; then
  note "DRIFT: PARITY.md missing in one or both repos."
  fail=1
elif ! cmp -s "$VOX_MAC/PARITY.md" "$VOX_WEB/PARITY.md"; then
  note "DRIFT: vox-mac/PARITY.md and vox-web/PARITY.md differ."
  note "Run: diff $VOX_MAC/PARITY.md $VOX_WEB/PARITY.md"
  fail=1
else
  note "ok"
fi

# 2) Stale invite-code placeholders. The format moved from VOX-XXXXX / OH-XXXXX
#    to VXABC12 — any leftover old placeholder is a UI bug.
header "invite-code placeholders"
stale_in() {
  local repo="$1" tree="$2"
  if [ -d "$repo/$tree" ]; then
    grep -rEn 'VOX-X+|OH-X+' "$repo/$tree" 2>/dev/null || true
  fi
}
stale=""
stale="$stale$(stale_in "$VOX_MAC" Sources)"
stale="$stale$(stale_in "$VOX_WEB" src)"
if [ -n "$stale" ]; then
  note "DRIFT: stale invite-code placeholder strings found:"
  printf '%s\n' "$stale" | sed 's/^/    /'
  fail=1
else
  note "ok"
fi

# 3) join_team_by_code RPC — the post-RLS join flow. Both clients must
#    reference it; if either falls back to a direct teams SELECT, joins break.
header "join_team_by_code RPC"
mac_hits=$(grep -rln 'join_team_by_code' "$VOX_MAC/Sources" 2>/dev/null | wc -l | tr -d ' ')
web_hits=$(grep -rln 'join_team_by_code' "$VOX_WEB/src" 2>/dev/null | wc -l | tr -d ' ')
if [ "$mac_hits" -lt 1 ] || [ "$web_hits" -lt 1 ]; then
  note "DRIFT: join_team_by_code missing from a client (mac=$mac_hits, web=$web_hits)."
  fail=1
else
  note "ok (mac=$mac_hits file(s), web=$web_hits file(s))"
fi

# 4) Wire-protocol message names — every type listed in PARITY.md must
#    appear in BOTH client repos. Doesn't validate field shapes (that's
#    on PresenceMessagesTests.swift in mac), only that nobody quietly
#    dropped or added a message in one client without the other.
header "wire protocol message coverage"
PROTO_MSGS=(
  REGISTER MODE_UPDATE PING CALL_REQUEST CALL_ACCEPT CALL_DECLINE
  CALL_END WEBRTC_SIGNAL PRESENCE_UPDATE REGISTERED PONG
  INCOMING_CALL CALL_ACCEPTED CALL_DECLINED CALL_ENDED ERROR
)
for msg in "${PROTO_MSGS[@]}"; do
  in_mac=0
  in_web=0
  grep -rqE "\"$msg\"" "$VOX_MAC/Sources" 2>/dev/null && in_mac=1 || true
  grep -rqE "\"$msg\"" "$VOX_WEB/src"     2>/dev/null && in_web=1 || true
  if [ "$in_mac" -ne "$in_web" ]; then
    note "DRIFT: $msg present in one client but not the other (mac=$in_mac, web=$in_web)."
    fail=1
  fi
done
[ "$fail" -eq 0 ] && note "ok (${#PROTO_MSGS[@]} messages match)"

# 5) Status mode names match. Mac and web must use the same wire-level enum.
header "status mode names"
for mode in GREEN YELLOW RED; do
  in_mac=0
  in_web=0
  grep -rqE "\"$mode\"" "$VOX_MAC/Sources" 2>/dev/null && in_mac=1 || true
  grep -rqE "\"$mode\"" "$VOX_WEB/src"     2>/dev/null && in_web=1 || true
  if [ "$in_mac" -ne "$in_web" ]; then
    note "DRIFT: mode $mode mismatched (mac=$in_mac, web=$in_web)."
    fail=1
  fi
done
[ "$fail" -eq 0 ] && note "ok"

if [ "$fail" -eq 0 ]; then
  echo
  echo "✓ no parity drift detected"
else
  echo
  echo "✗ parity drift — see above. Fix before merging." >&2
  exit 1
fi
