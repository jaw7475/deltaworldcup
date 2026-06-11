# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

Tracks who is leading for the #1 overall pick of the 2026 Delta Fantasy Football League. The 2026 FIFA World Cup determines draft order: 12 league members were each randomly assigned 4 teams, most points wins #1, tiebreaker is total goals scored.

## Scoring rules (encoded — see `lib/scoring/engine.ts`)

- **Group:** Win 3, Draw 1, Loss 0.
- **Knockout:** Win (any way) 3; loss in ET or pens 1; loss in regulation 0.
- **Tiebreaker:** goals scored — ET goals count, **shootout goals don't**.
- **Live table:** in-progress matches contribute provisional points + GF. Group → score as if match ended now. KO in regulation: leading → provisional KO_WIN, trailing → KO_LOSS_REG, tied → 0pt `LIVE_KO_TIED` (no one has lost in regulation yet). KO in ET trailing → 1pt provisional `KO_LOSS_ET`. Rows where any contributing match is live have `hasLiveMatch: true`, surfaced in the UI as a pulsing light-blue dot.

## Commands

```bash
pnpm install          # install
pnpm dev              # next dev (default port 3000; override with PORT=)
pnpm build            # production build
pnpm test             # vitest run (engine + windowing)
pnpm test:watch       # watch mode
pnpm lint             # next lint
```

### Running locally without external API or KV

```bash
MOCK_PROVIDER=1 MOCK_FIXTURES=liveDemo pnpm dev
# Then in another shell:
curl 'http://localhost:3000/api/cron/refresh?force=1'   # populate KV
curl 'http://localhost:3000/api/standings' | jq         # see snapshot
open http://localhost:3000                              # leaderboard
```

`MOCK_FIXTURES` accepts `scheduled` (default, nothing played), `midGroupStage` (one match finished), or `liveDemo` (one finished + one live). Without `MOCK_PROVIDER=1`, the app uses `FootballDataApiProvider` and needs `FOOTBALL_DATA_TOKEN`. Without `KV_REST_API_URL` + `KV_REST_API_TOKEN`, the KV layer falls back to an in-memory store pinned on `globalThis` (so it survives hot reloads in dev but not server restarts).

### Running a single test

```bash
pnpm vitest run lib/scoring/engine.test.ts
pnpm vitest run -t "KO pens win"   # filter by test name
```

## Architecture — the big picture

```
provider (football-data.org | mock)
        │
        ▼
   /api/cron/refresh   (Vercel Cron, */5 * * * *)
        │  - short-circuits outside 09:00–01:00 America/Los_Angeles
        │  - short-circuits when not inside any match window (170-min)
        ▼
   KV: matches:all, standings:current, standings:history, sync:*
        │
        ▼
   /api/standings   ←   <Leaderboard> client-island polls (30s in-window, 5m out)
   /api/member/[id] ←   detail page + intercepting modal route
```

Three layers, isolated by file:

1. **`lib/scoring/`** — pure functions, no I/O. The correctness-critical core. Touch with TDD.
2. **`lib/providers/`** — wraps any external API behind a `FootballDataProvider` interface. Swap the impl by editing `lib/providers/index.ts` without touching the engine or UI.
3. **`lib/windows/`** — windowing and Pacific-hours logic, also pure. Used by the cron to decide whether to call upstream at all.

The cron handler is the **only** thing that writes to KV. Every other read path (`page.tsx`, `/api/standings`, `/api/member/[id]`) is read-only against KV — they never touch the upstream API. This decouples user load from provider quota.

### Match data model

`lib/scoring/types.ts` defines `Match`. The key field is `fullTime` — score at the end of ET-if-played-else-90, excluding shootout goals. **`fullTime` is what feeds the GF tiebreaker.** `currentScore` is "what's on the screen right now" for LIVE matches. `penalties` is stored separately and only consulted for determining `winner`. Don't conflate these.

### Snapshot/history rule

`standings:history` is **only** appended when no row has `hasLiveMatch` (see `maybeAppendHistory` in `lib/standings/snapshot.ts`). This prevents the position-history chart from jittering as live scores swing. Live-provisional standings are shown in real time but not recorded.

### Config + build-time validation

`lib/config/teams.ts` and `lib/config/members.ts` self-validate at import (48 teams in 12 groups, 12 members × 4 distinct teams, every team assigned exactly once). A misconfigured roster throws at module load, surfaced as a build/runtime error long before any data is computed.

**The current `members.ts` and `teams.ts` are placeholders.** Replace them with the actual league members and the 2026 draw results before launch. The 4-letter TBD codes (`TBD_A4`, `TBD_B4`, …) represent qualification slots still to be decided.

### Intercepting modal route

`app/members/[id]/page.tsx` is the full-page detail. `app/@modal/(.)members/[id]/page.tsx` is the intercepting route that opens the same content as a modal when navigated from `/`. Both share `<MemberDetailView>`. Refreshing the URL renders the full page; clicking from the leaderboard renders the modal. `app/@modal/default.tsx` returns null so the slot is empty on routes that don't intercept.

## Risks / gotchas

- **football-data.org WC access:** verify the free-tier token actually returns 2026 WC fixtures before relying on it. If 403, swap the impl in `lib/providers/index.ts` for an API-FOOTBALL implementation behind the same interface.
- **`score.fullTime` semantics:** football-data's `score.fullTime` is expected to include ET goals and exclude shootout goals. Confirm against a known 2022 WC ET match before trusting it for the GF tiebreaker.
- **Don't write to KV on a failed sync.** The cron handler preserves last-good `standings:current` when the upstream call or zod parse fails. UI shows a "data may be stale" badge once `lastSuccessAt` is more than 2h old.
- **Pacific cutoff is a hard 01:00 LA boundary.** A match running past 1am Pacific will stop receiving cron updates until 9am. Picked deliberately to avoid overnight pings (no World Cup kickoffs happen during that window anyway).
