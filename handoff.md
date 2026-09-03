# Handoff — VisionStudio

Coordination doc for multiple concurrent Claude Code sessions working this repo. **Read this before making changes, and update the relevant section when you finish a unit of work** — this repo has had unintentional overwrites and stale-state confusion from sessions working blind to each other.

Last updated: 2026-09-03 (hosted-backend investigation), by session `01PTYvucPv97c7RESYj1FDk5`.

## Current state (verified, not assumed)

- **Repo**: `/Users/james/Projects/visionstudio` (renamed from `visionedit` in `b21b85a`, 2026-09-02).
- **HEAD**: `57eaa59` — "Update handoff.md: real-device iOS build confirmed working". Working tree clean except one untracked file (see Open items).
- **Web app**: fully functional. `tsc --noEmit` clean, 35/35 vitest unit tests pass, 4/4 Playwright e2e tests pass.
- **Local dev servers**: backend on `:3001`, frontend on `:3002` (via `./startup.sh start|stop|restart|status`; see `.run/*.log`). CORS accepts the configured `FRONTEND_ORIGIN` plus `capacitor://localhost`/`ionic://localhost` for the native app.
- **iOS app**: Capacitor-wrapped, Xcode project at `ios/App/App.xcodeproj`, bundle ID `com.th3rdai.visionstudio`. **Built and verified working on both the iPhone 17 Simulator AND the user's real physical iPhone 17 Pro Max** (`xcrun devicectl` — reconnected via USB 2026-09-03; was showing "Offline" before that). Confirmed a real network round-trip to the LAN backend on the real device too: `.run/backend.log` shows fresh `200 GET /api/key-status` responses timestamped to the exact moment the app was launched on-device, proving the phone reached the Mac's LAN backend through CORS + ATS over real Wi-Fi (not just the simulator's shared network stack).
  - Real-device build needs `DEVELOPMENT_TEAM=9LRPX62LGN` (not set in the `.pbxproj` — pass it as an `xcodebuild` arg, or it'll fail with "Signing requires a development team"). Signing identity: "Apple Development: JAIME AVILA (8LV6ZF6DUA)", automatic provisioning via `-allowProvisioningUpdates`.
  - Device UDID (xctrace/simctl-style): `00008150-001449EA0C98C01C`. CoreDevice identifier (what `devicectl` wants): `C3718A18-1FCF-55E5-BCE3-F87BBB68AEE0`. `xcrun xctrace list devices` can lag/show stale "Offline" state — trust `xcrun devicectl list devices` instead if there's a discrepancy.
  - Install/launch on real device: `xcrun devicectl device install app --device <coredevice-id> <path-to-.app>` then `xcrun devicectl device process launch --device <coredevice-id> com.th3rdai.visionstudio`.
  - Built with `VITE_BACKEND_URL=http://192.168.50.7:3001 npm run build && npx cap sync ios` — that IP is this Mac's current LAN address (`ipconfig getifaddr en0`), will change if the network changes. **Both the Mac and the phone must be on the same Wi-Fi network** for this to work on a real device (unlike the simulator, which shares the Mac's network stack automatically).
  - `ios/App/App/public/` (Capacitor's synced copy of `dist/`) is gitignored — regenerate with the command above before opening Xcode if it's stale.
  - `HOSTED=true` env var (unset in local dev) disables `/api/restart` and the shared `.env` API-key fallback for a future public deployment (`78ef0e3`).

## Who's touched what (commit-log timeline, most recent first)

| Commit | What | Session |
|---|---|---|
| *(no commit — server state)* | Deployed `backend/index.js` to `vision.th3rdai.com` (Linode, systemd+nginx+TLS); found Gemini geo-blocks that server's IP | `01PTYvucPv97c7RESYj1FDk5` |
| `57eaa59` | handoff.md: real-device milestone confirmed | `01G4jeWmRThqhH8xZKFyuf1T` |
| `03dc96a` | Added this handoff.md | `01G4jeWmRThqhH8xZKFyuf1T` |
| `f92c783` | iOS CORS/ATS/safe-area fixes, built+verified on Simulator | `01G4jeWmRThqhH8xZKFyuf1T` |
| `78ef0e3` | Gate `/api/restart` + `.env` key fallback behind `HOSTED=true` | `01PTYvucPv97c7RESYj1FDk5` |
| `93b26d3` | Capacitor iOS scaffold; rewrote `backendUrl.ts` for native builds; **removed `AppSettings.tsx`** (port-config UI — meaningless in a native bundle) | `01PTYvucPv97c7RESYj1FDk5` |
| `568a31d` | Responsive `sm:` breakpoints for iPhone viewports | `01PTYvucPv97c7RESYj1FDk5` |
| `a295ded` | Fixed stale `:3000` port docs, false "no test framework" note | `01G4jeWmRThqhH8xZKFyuf1T` |
| `b594c76` | Untracked `playwright-report/`/`test-results/`; fixed e2e port config | `01PTYvucPv97c7RESYj1FDk5` |
| `1f178a2` | Safari HSTS troubleshooting doc, eye logo, contrast fixes | `01PTYvucPv97c7RESYj1FDk5` |
| `b21b85a` | Renamed `visionedit` → `visionstudio` (directory + docs) | `01PTYvucPv97c7RESYj1FDk5` |
| `574b8ed` | Purged a leaked API key from git history via `git filter-repo` (history rewrite — SHAs before this point are not the same as before) | `01PTYvucPv97c7RESYj1FDk5` |
| `f5b9430` | Text-to-image gen, API key settings fixes, brand gradient/Space Grotesk, port settings feature | both sessions independently converged on similar work here |

**Note on history rewrite**: `574b8ed`'s commit message documents a `git filter-repo` run before it to strip a committed `backend/.env.backup` (real, since-rotated key). If you have an older local clone or fork from before 2026-09-02 ~15:14, its SHAs won't match `main` — don't force-push an old branch over this history.

## Open items / not yet done

- **`assets/Text-Logo.png`** — added alongside the Capacitor commits, still unreferenced anywhere in `src/`. Unclear if it's intended for the iOS app icon/splash screen or leftover. *Don't delete without checking — ask the user or whoever added it.*
- ~~Real device testing unconfirmed~~ **RESOLVED 2026-09-03**: reconnected via USB, built + installed + launched on the user's real iPhone 17 Pro Max, confirmed working (see Current state above). If it shows "Offline" again in `xctrace`, check `xcrun devicectl list devices` first — that one stayed accurate when `xctrace`'s cache didn't.
- **Hosted backend: deployed but blocked by a Gemini API geo-restriction — not a code problem.** This is real server state, not reflected in git:
  - `backend/index.js` (as of `78ef0e3`) is live at `https://vision.th3rdai.com` on the user's existing Linode (`th3rdai.com`, `172.235.56.224`, `us-lax`/LA region) — nginx reverse proxy + Let's Encrypt cert (auto-renews) + a hardened systemd unit (`/etc/systemd/system/visionstudio-backend.service`, app at `/opt/visionstudio-backend`, env at `/etc/visionstudio-backend.env` with `HOSTED=true` and `PORT=3011`, **no `GOOGLE_API_KEY` on the server** — every caller must send its own `X-API-Key`). All verified working from this Mac: `/api/restart` 404s, `/api/generate` correctly rejects a keyless request, TLS is valid.
  - **The blocker**: Gemini's API itself rejects requests from this Linode's IP with `"User location is not supported for the API use."` — confirmed with a raw `curl` straight to `generativelanguage.googleapis.com` from the server (bypassing our code entirely), so this is Google IP-reputation/geo-blocking the Linode's datacenter IP range, not a bug in `backend/index.js`. The exact same API key works fine from the user's Mac.
  - **Systemd gotcha hit and fixed**: the unit's `MemoryDenyWriteExecute=true` hardening directive crashes Node with a fatal V8 OOM (JIT needs W^X-violating executable-memory allocation) — removed that one directive from the unit; everything else in the hardening block is fine. If you copy this unit as a template elsewhere, don't re-add it for a Node process.
  - **What was tried and explicitly NOT pursued further** (user's call, not a technical dead end): tested whether Cloudflare Workers' egress IPs dodge the block (needs the user to auth `wrangler login` — not completed) and whether booting an existing-but-unused `ca-central` Linode (`support`, id `46800153`, was offline) gives a different-region IP — booted it, found no SSH key access, would have needed adding this Mac's key to the Linode account (account-wide Lish access, not scoped to one box) to test via Lish console. **User decided that was too much escalating infra risk for a diagnostic and asked to stop** — the `support` box was shut back down to its prior offline state, nothing else was changed on it. Re-litigate before trying it again.
  - **Where this leaves it**: `vision.th3rdai.com` is a fully working, secured backend — it just can't successfully call Gemini from that specific server's network. Options if picked back up: a fresh Linode in a genuinely different provider/region (not just re-testing the old `support` box), or reconsider a PaaS host (Fly.io/Railway — original plan's fallback, untested) which may have different egress IP reputation. Until resolved, the LAN-IP dev workflow (see Simulator/real-device notes above) is the only working end-to-end path.
- **`NSAllowsLocalNetworking` in `ios/App/App/Info.plist` is a dev-only ATS exception** — fine for LAN testing, not a substitute for HTTPS hosting. Don't widen it to `NSAllowsArbitraryLoads` as a shortcut.
- **Doc drift**: README/CLAUDE.md describe only the local two-terminal/`startup.sh` workflow. Nothing yet documents the iOS build-and-run steps or the `HOSTED=true` production path.
- **Python permission rules, port-settings UI**: both previously flagged issues are resolved (permission rules were already clean when checked; `AppSettings.tsx` was intentionally removed in `93b26d3` since it no longer applies to a native build).

## Conventions this repo has settled on

- Frontend dev port: **3002** (not 3000 — fixed in `a295ded`/`package.json`'s `dev` script).
- Backend dev port: **3001**.
- `./startup.sh {start|stop|restart|status}` manages both local processes; PID files and logs in `.run/`.
- Hosted deploys of `backend/index.js` follow the `chat.th3rdai.com`/`hermes-chat-bridge` pattern already on `th3rdai.com`: app in `/opt/<name>`, secrets in a root-only `/etc/<name>.env` (`chmod 600`), a systemd unit at `/etc/systemd/system/<name>.service`, nginx reverse-proxy site in `/etc/nginx/sites-available/`, Let's Encrypt via `certbot --webroot`. **Do not set `MemoryDenyWriteExecute=true`** in the unit's hardening block for a Node service — it crashes V8 with a fatal OOM (JIT needs executable-memory allocation that directive blocks). Every other hardening directive in the template is fine.
- Brand colors: `--color-brand-blue: #3d5afe`, `--color-brand-purple: #a855f7` (`src/index.css` `@theme`), gradient darkened ~28% (`#2d43c4`→`#7d3fc9`) specifically for `.bg-brand-gradient` so white button text clears WCAG AA — don't "fix" it back to the raw brand tokens.
- Font: Space Grotesk (matches th3rdai.com) + JetBrains Mono for the console-style uppercase labels.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` and a `Claude-Session:` link.

## If you're a new session picking this up

1. Run `git log --oneline -15` and `git status` first — don't trust anything in this file's timeline table blindly, it's a snapshot.
2. Check `ps aux | grep "claude --dangerously"` for other live sessions before doing anything destructive (renames, history rewrites, force-pushes).
3. Update this file's "Current state" and timeline table when you land something non-trivial, so the next session (or the next wake of an existing one) doesn't have to reconstruct it from `git log` alone.
