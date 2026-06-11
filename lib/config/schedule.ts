import type { Stage, TeamCode } from "@/lib/scoring/types"

export interface ScheduledMatch {
  id: string
  stage: Stage
  /** ISO UTC kickoff time. */
  utcKickoff: string
  home: TeamCode
  away: TeamCode
}

/**
 * Hardcoded 2026 World Cup fixture list.
 * REPLACE this stub with the real schedule (or build it from the provider once
 * confirmed in /api/cron/refresh). Keys: `id` must match the provider's match id
 * once the provider is wired so windowing aligns 1:1 with live data.
 *
 * The current entries are placeholders to exercise the windowing logic in tests
 * and the pre-tournament UI banner.
 */
export const SCHEDULE: readonly ScheduledMatch[] = [
  {
    id: "wc-2026-1",
    stage: "GROUP",
    utcKickoff: "2026-06-11T20:00:00Z",
    home: "MEX",
    away: "TBD_A4",
  },
  {
    id: "wc-2026-2",
    stage: "GROUP",
    utcKickoff: "2026-06-12T19:00:00Z",
    home: "CAN",
    away: "TBD_A4",
  },
  {
    id: "wc-2026-final",
    stage: "FINAL",
    utcKickoff: "2026-07-19T19:00:00Z",
    home: "TBD_A4",
    away: "TBD_B4",
  },
] as const
