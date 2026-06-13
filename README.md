# deltaworldcup

Tracker for the #1 overall pick of the 2026 Delta Fantasy Football League. The 2026 FIFA World Cup decides draft order — 12 league members were each randomly assigned 4 teams, most total points wins #1, total goals scored is the tiebreaker.

## What's in the site

- **Table** — live leaderboard, including provisional points for matches currently in progress.
- **Fixtures** — every member's 4 teams plotted across the tournament calendar.
- **Draft Board** — Sleeper-tracked 2026 rookie picks rendered against the current standings (traded picks included).
- **Power Rankings** — Monte-Carlo projection of where each member is likely to finish, refreshed by its own cron.
- **Member detail** — per-member breakdown of every contributing match (full-page or as an intercepting modal from the leaderboard).

## Scoring

| Stage | Result | Points |
|---|---|---|
| Group | Win | 3 |
| Group | Draw | 1 |
| Group | Loss | 0 |
| Knockout | Win (any way) | 3 |
| Knockout | Loss in ET or pens | 1 |
| Knockout | Loss in regulation | 0 |

Tiebreaker is total goals scored. Extra-time goals count; shootout goals don't.

## Quick start

```bash
pnpm install
MOCK_PROVIDER=1 MOCK_FIXTURES=liveDemo pnpm dev
curl 'http://localhost:3000/api/cron/refresh?force=1'
open http://localhost:3000
```

`pnpm test` runs the scoring engine, windowing logic, draft-pick computation, and power-rankings projection tests.

## Stack

Next.js 15 (App Router, server components) · React 19 · Tailwind · Vercel KV · Vitest · football-data.org for live match data · Sleeper API for the rookie draft · optional Anthropic API for power-rankings blurbs.

See [CLAUDE.md](./CLAUDE.md) for the full architecture, env-var reference, scoring engine details, and gotchas.
