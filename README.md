# deltaworldcup

Live tracker for the **#1 overall pick of the 2026 Delta Fantasy Football League**. The 2026 FIFA World Cup decides the fantasy draft order: 12 league members were each randomly assigned 4 of the 48 World Cup teams. Most total points wins the #1 pick; total goals scored is the tiebreaker. The site scores every match as it happens, projects where each member is likely to finish, and renders the resulting rookie-draft order against live Sleeper data.

## Purpose

This is a single-purpose companion site for one fantasy league. It answers one question all tournament long — *"who is winning the #1 pick right now?"* — and surrounds that answer with the context to understand it:

- A **live leaderboard** that updates provisionally while matches are in progress.
- A **fixtures view** of every member's four teams across the tournament calendar.
- A **Monte-Carlo power ranking** projecting each member's likely final position.
- A **draft board** that maps the standings onto the league's actual Sleeper rookie draft, traded picks included.

All football data is pulled by a cron job into a KV store; every user-facing page reads only from KV, so user traffic never touches the upstream football API and never burns its quota.

## Features

| Tab | What it shows |
|---|---|
| **Rules** | Static scoring reference. |
| **Table** | Live leaderboard. In-progress matches contribute provisional points + goals, flagged with a pulsing live dot. |
| **Fixtures** | Every member's 4 teams plotted across the tournament calendar. |
| **Draft Board** | Sleeper-tracked 2026 rookie picks rendered against current standings, including traded picks. |
| **Power Rankings** | Monte-Carlo projection of each member's likely finish, plus optional AI-written blurbs, refreshed by its own cron. |
| **Member detail** | Per-member breakdown of every contributing match — as a full page, or an intercepting modal from the leaderboard. |

Plus a next-kickoff countdown banner, a position-history chart, a tournament top-scorers list, and a "data may be stale" badge that appears when the last successful sync is over 2 hours old.

## Scoring

| Stage | Result | Points |
|---|---|---|
| Group | Win | 3 |
| Group | Draw | 1 |
| Group | Loss | 0 |
| Knockout | Win (any way) | 3 |
| Knockout | Loss in ET or pens | 1 |
| Knockout | Loss in regulation | 0 |

Tiebreaker is total goals scored. **Extra-time goals count; shootout goals don't.** The scoring engine (`lib/scoring/engine.ts`) is pure and TDD-covered — it's the correctness-critical core of the app.

## Technology stack

- **[Next.js 15](https://nextjs.org/)** (App Router, React Server Components) · **React 19**
- **[Tailwind CSS](https://tailwindcss.com/)** for styling; **[Framer Motion](https://www.framer.com/motion/)** for animation; **[Recharts](https://recharts.org/)** for the position-history chart; `canvas-confetti` + `country-flag-icons` for flourish.
- **[Vercel KV](https://vercel.com/docs/storage/vercel-kv)** (Upstash Redis) as the only datastore — with an in-memory fallback for local dev.
- **[Zod](https://zod.dev/)** for validating provider payloads.
- **[Vitest](https://vitest.dev/)** for the scoring, windowing, draft-pick, and projection tests.
- **[football-data.org](https://www.football-data.org/)** for live match data (swappable behind a provider interface).
- **[Sleeper API](https://docs.sleeper.com/)** for the rookie-draft rosters and traded picks.
- **[Anthropic API](https://docs.claude.com/)** (optional) for the power-rankings blurbs.
- Deployed on **[Vercel](https://vercel.com/)**, driven by an external cron scheduler.

## Quick start (local, no external services)

The app runs fully offline with a mock provider and an in-memory KV store — no API tokens, no database.

```bash
pnpm install
MOCK_PROVIDER=1 MOCK_FIXTURES=liveDemo pnpm dev

# in another shell, populate the KV store:
curl 'http://localhost:3000/api/cron/refresh?force=1'          # matches + standings + scorers
curl 'http://localhost:3000/api/cron/power-rankings'           # power-rankings snapshot

open http://localhost:3000
```

`MOCK_FIXTURES` accepts `scheduled` (nothing played yet — default), `midGroupStage` (one match finished), or `liveDemo` (one finished + one live).

```bash
pnpm test        # scoring engine + windowing + draft picks + power-rankings projection
pnpm build       # production build
pnpm lint        # next lint
```

## Replicating this for another league

The app is written for one specific league, but everything league-specific lives in config files. To stand up your own tracker:

### 1. Configure your members and their teams

Edit **`lib/config/members.ts`** — 12 members, each with an `id`, `displayName`, exactly 4 `teams` (by 3-letter code), an optional `accentColor`, and an optional `sleeperUserId`.

Edit **`lib/config/teams.ts`** — the 48 tournament teams with their FIFA code, name, and `iso2` (drives the flag SVG). Fill in each team's `group` letter once the official draw is out to unlock group-stage views.

These files **self-validate at import**: 48 distinct team codes, 12 members × 4 distinct teams, every team owned by exactly one member, no duplicate accent colors. A misconfigured roster throws at build/startup — long before any data is computed — so you'll catch mistakes immediately.

### 2. Point the Draft Board at your Sleeper league

Set `SLEEPER_LEAGUE_ID` (env var, or replace the fallback in **`lib/config/sleeper.ts`**), and set each member's `sleeperUserId` in `members.ts` so standings positions map to the right Sleeper roster slots. Adjust `DRAFT_ROUNDS` / `DRAFT_SLOTS` if your draft differs. If you don't use Sleeper, leave the IDs unset and the board falls back to standings-only.

### 3. Provide a live-data source

Get a free token from [football-data.org](https://www.football-data.org/) and set `FOOTBALL_DATA_TOKEN`. **Verify the free tier actually returns 2026 World Cup fixtures before relying on it** — if it 403s, implement the `FootballDataProvider` interface against another API (e.g. API-FOOTBALL) and swap it in `lib/providers/index.ts`. The engine and UI never change.

### 4. Set up storage and secrets

| Var | Purpose |
|---|---|
| `FOOTBALL_DATA_TOKEN` | Real provider auth. Absent ⇒ mock provider. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel KV creds. Absent ⇒ in-memory KV (dev only). |
| `SLEEPER_LEAGUE_ID` | Draft Board source league (fallback in `sleeper.ts`). |
| `CRON_SECRET` | Bearer-token gate on the cron endpoints. Absent ⇒ open (dev). |
| `ANTHROPIC_API_KEY` | Power-rankings blurbs. Absent ⇒ snapshot still writes, blurbs skipped. |
| `MOCK_PROVIDER`, `MOCK_FIXTURES` | Force the mock provider + choose the fixture set. |

Provision a Vercel KV (Upstash Redis) store and set its two `KV_REST_API_*` vars. Set a strong `CRON_SECRET` in production.

### 5. Deploy and schedule the crons

Deploy to Vercel. The two cron endpoints are **not** self-triggering — drive them from an external scheduler (Vercel Cron, GitHub Actions, cron-job.org, etc.), sending `Authorization: Bearer $CRON_SECRET`:

- `GET /api/cron/refresh` — every ~2 minutes. Pulls matches, standings, and top scorers. Self-throttles: fires every call during a 170-minute window around any kickoff, once per 15 min otherwise, and short-circuits entirely outside 09:00–01:00 America/Los_Angeles.
- `GET /api/cron/power-rankings` — independently (e.g. every 10–15 min). Runs the Monte-Carlo projection and optional blurbs.

That's it — every other route reads from KV and needs no scheduling.

## Documentation

See **[CLAUDE.md](./CLAUDE.md)** for the full architecture (data flow, layer breakdown, KV keys), the complete env-var reference, live-scoring semantics, snapshot/history rules, and the list of known risks and gotchas.
