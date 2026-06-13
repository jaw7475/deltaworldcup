# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

Tracks who is leading for the #1 overall pick of the 2026 Delta Fantasy Football League. The 2026 FIFA World Cup determines draft order: 12 league members were each randomly assigned 4 teams, most points wins #1, tiebreaker is total goals scored. The site also visualises the Sleeper-tracked 2026 rookie draft and a Monte-Carlo power-rankings projection for the rest of the tournament.

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
pnpm test             # vitest run (engine + windowing + draft picks + power-rankings projection)
pnpm test:watch       # watch mode
pnpm lint             # next lint
```

### Running locally without external API or KV

```bash
MOCK_PROVIDER=1 MOCK_FIXTURES=liveDemo pnpm dev
# Then in another shell:
curl 'http://localhost:3000/api/cron/refresh?force=1'         # populate matches + standings + scorers
curl 'http://localhost:3000/api/cron/power-rankings'          # populate power-rankings snapshot
curl 'http://localhost:3000/api/standings' | jq               # see leaderboard snapshot
open http://localhost:3000                                    # full UI
```

`MOCK_FIXTURES` accepts `scheduled` (default, nothing played), `midGroupStage` (one match finished), or `liveDemo` (one finished + one live). Without `MOCK_PROVIDER=1`, the app uses `FootballDataApiProvider` and needs `FOOTBALL_DATA_TOKEN`. Without `KV_REST_API_URL` + `KV_REST_API_TOKEN`, the KV layer falls back to an in-memory store pinned on `globalThis` (so it survives hot reloads in dev but not server restarts).

### Running a single test

```bash
pnpm vitest run lib/scoring/engine.test.ts
pnpm vitest run -t "KO pens win"                  # filter by test name
pnpm vitest run lib/powerRankings/projection.test.ts
pnpm vitest run lib/draft/picks.test.ts
```

### Environment variables

| Var | Used by | Purpose |
|---|---|---|
| `FOOTBALL_DATA_TOKEN` | `lib/providers/index.ts` | Real provider auth. Absent ⇒ MockProvider. |
| `MOCK_PROVIDER`, `MOCK_FIXTURES` | provider selector | Force mock + pick fixture set. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | `lib/kv/client.ts` | Vercel KV creds. Absent ⇒ in-memory KV. |
| `CRON_SECRET` | `/api/cron/*` | Bearer-token gate on both cron endpoints. Absent ⇒ open (dev). |
| `SLEEPER_LEAGUE_ID` | `lib/config/sleeper.ts` | Override the Draft Board's source league. Has a hardcoded fallback. |
| `ANTHROPIC_API_KEY` | `lib/powerRankings/blurb.ts` | Generates the power-rankings blurbs. Absent ⇒ snapshot still writes, blurbs are skipped. |

## Architecture — the big picture

```
provider (football-data.org | mock)
        │
        ▼
   /api/cron/refresh           (external scheduler hits it every 2 min)
        │  - requires `Authorization: Bearer $CRON_SECRET` (when env var is set)
        │  - short-circuits outside 09:00–01:00 America/Los_Angeles
        │  - short-circuits when not inside any match window (170-min, computed
        │    from the persisted match list — falls back to SCHEDULE stub only
        │    when KV hasn't synced yet)
        │  - writes matches:all, standings:current/history, sync:*, scorers:list
        ▼
   /api/cron/power-rankings    (external scheduler hits it independently)
        │  - same auth gate
        │  - reads matches + standings from KV, runs Monte-Carlo + xPts +
        │    optional Anthropic blurbs, writes powerRankings:current/previous
        ▼
   KV
        │
        ▼
   /api/standings        ←   <Leaderboard> + <NextKickoffBanner> poll (30s in-window, 5m out)
   /api/member/[id]      ←   detail page + intercepting modal route
   /api/draft-board      ←   <DraftBoard> poll
   /api/power-rankings   ←   <PowerRankings> read on initial render
```

Layers, isolated by file:

1. **`lib/scoring/`** — pure functions, no I/O. The correctness-critical core. Touch with TDD.
2. **`lib/providers/`** — wraps any external API behind a `FootballDataProvider` interface (matches + match detail + tournament top scorers). Swap the impl by editing `lib/providers/index.ts` without touching the engine or UI. `lib/providers/sleeper.ts` is a separate, single-purpose client for the Sleeper rookie-draft data.
3. **`lib/windows/`** — windowing and Pacific-hours logic, also pure. Two variants: `isInWindow(now, SCHEDULE)` (stub) and `inWindowFromMatches(now, matches)` (real persisted list). Prefer the latter everywhere except as a pre-sync fallback.
4. **`lib/standings/`** — KV reads/writes, `buildSnapshot`, top-scorers refresh, fixture indexing.
5. **`lib/draft/`** — slot order, pick computation, Sleeper data loader (with its own KV cache).
6. **`lib/powerRankings/`** — Monte-Carlo simulation, expected-points math, results-since-last diff, optional Anthropic blurb writer, snapshot store.
7. **`lib/kv/`** — thin `getKv()` indirection so Vercel KV and the in-memory fallback share an interface.
8. **`lib/config/`** — `members.ts`, `teams.ts`, `schedule.ts` (STUB), `sleeper.ts`, `elo.ts`, `playersToWatch.ts`. Self-validating where applicable.

The cron handlers are the **only** things that write the football data into KV. Every other read path (`page.tsx`, `/api/standings`, `/api/member/[id]`, `/api/power-rankings`) is read-only against KV — they never touch the upstream football-data API. This decouples user load from provider quota. The Draft Board path is the one exception: `lib/draft/load.ts` lazy-fetches Sleeper directly when its 5-minute KV cache expires.

### UI tabs (`app/page.tsx`)

| Tab | Component | Source |
|---|---|---|
| Rules | `<RulesCard>` | Static. |
| Table | `<Leaderboard>` + `<LiveLegend>` | `standings:current` via `/api/standings`. |
| Fixtures | `<FixturesGrid>` | `matches:all` (passed as prop on the server render — no client polling). |
| Draft Board | `<DraftBoard>` | `/api/draft-board` — Sleeper + standings. |
| Power Rankings | `<PowerRankings>` | `/api/power-rankings` — Monte-Carlo snapshot. |

The top of the page renders `<NextKickoffBanner>` (countdown to next kickoff, or "Match in progress") and `<StaleBadge>` (visible when last successful sync is older than 2h).

### Match data model

`lib/scoring/types.ts` defines `Match`. The key field is `fullTime` — score at the end of ET-if-played-else-90, excluding shootout goals. **`fullTime` is what feeds the GF tiebreaker.** `currentScore` is "what's on the screen right now" for LIVE matches. `penalties` is stored separately and only consulted for determining `winner`. Don't conflate these.

### Snapshot/history rule

`standings:history` is **only** appended when no row has `hasLiveMatch` (see `maybeAppendHistory` in `lib/standings/snapshot.ts`). This prevents the position-history chart from jittering as live scores swing. Live-provisional standings are shown in real time but not recorded.

### Config + build-time validation

`lib/config/teams.ts` and `lib/config/members.ts` self-validate at import: 48 distinct team codes; 12 members × 4 distinct teams; every team assigned to exactly one member; no duplicate accent colors. A misconfigured roster throws at module load, surfaced as a build/runtime error long before any data is computed.

`members.ts` and `teams.ts` are populated with the real 12 league members and all 48 qualified teams. Team `group` letters are still optional/unset because the official 2026 draw groupings have not been encoded yet — populate the `group` field on each team in `teams.ts` once that's done to unlock group-stage standings views.

### Intercepting modal route

`app/members/[id]/page.tsx` is the full-page detail. `app/@modal/(.)members/[id]/page.tsx` is the intercepting route that opens the same content as a modal when navigated from `/`. Both share `<MemberDetailView>`. Refreshing the URL renders the full page; clicking from the leaderboard renders the modal. `app/@modal/default.tsx` returns null so the slot is empty on routes that don't intercept.

### Power-rankings pipeline

`lib/powerRankings/compute.ts` reads matches + current standings from KV, runs `montecarlo.ts` over the remaining schedule to produce per-member projected finish distributions, blends with `expectedPoints.ts` (banked + expected), diffs against the last snapshot via `resultsSinceLast.ts`, and (if `ANTHROPIC_API_KEY` is set) asks Claude to write a short blurb per member via `blurb.ts`. The snapshot is stored under `powerRankings:current` and the previous one is preserved under `powerRankings:previous` for diff rendering.

### Draft Board pipeline

`lib/draft/load.ts` loads Sleeper rosters + traded picks (cached in KV for 5 min — keyed under `sleeper:*`), maps roster IDs to member IDs by name, and calls `lib/draft/picks.ts` to compute final pick ownership per slot/round given current standings. `getSlotOrder()` derives slot order from the standings; ties go to the snake-draft fallback. When Sleeper is unreachable, the loader returns the last successful cache with `sleeperStatus: "stale"` so the UI can flag it.

## Risks / gotchas

- **football-data.org WC access:** verify the free-tier token actually returns 2026 WC fixtures before relying on it. If 403, swap the impl in `lib/providers/index.ts` for an API-FOOTBALL implementation behind the same interface.
- **`score.fullTime` semantics:** football-data's `score.fullTime` is expected to include ET goals and exclude shootout goals. Confirm against a known 2022 WC ET match before trusting it for the GF tiebreaker.
- **Don't write to KV on a failed sync.** The cron handler preserves last-good `standings:current` when the upstream call or zod parse fails. UI shows a "data may be stale — try refreshing" badge once `lastSuccessAt` is more than 2h old.
- **Pacific cutoff is a hard 01:00 LA boundary.** A match running past 1am Pacific will stop receiving cron updates until 9am. Picked deliberately to avoid overnight pings (no World Cup kickoffs happen during that window anyway).
- **Window check uses persisted matches, not SCHEDULE.** The SCHEDULE stub (`lib/config/schedule.ts`) is a placeholder — only used as a pre-sync fallback. Anything that gates on "is there a live/upcoming match" must call `inWindowFromMatches(now, matches)` against the KV-persisted list. Reverting to `isInWindow(now, SCHEDULE)` will break the cron the moment the SCHEDULE stub goes stale.
- **`FixturesGrid` does not poll.** The fixtures tab receives `matches` once at page load (server render) and never refreshes client-side. If you need live fixture status mid-session, wire it to `/api/standings` (or a new endpoint exposing matches) the way `<Leaderboard>` does.
- **Power-rankings blurbs are best-effort.** If `ANTHROPIC_API_KEY` is missing or the call fails, the snapshot still writes but with empty blurbs — don't gate the projection on blurb success.
- **Sleeper league ID has a hardcoded fallback.** If you fork this for another league, set `SLEEPER_LEAGUE_ID` in env — relying on the fallback will silently surface the wrong league's draft.
