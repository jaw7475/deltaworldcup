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
 * STUB — replace with the real fixture list (or pull from the provider once
 * confirmed in /api/cron/refresh). `id` must match the provider's match id so
 * windowing aligns 1:1 with live data.
 */
export const SCHEDULE: readonly ScheduledMatch[] = [
  {
    id: "wc-2026-1",
    stage: "GROUP",
    utcKickoff: "2026-06-11T20:00:00Z",
    home: "MEX",
    away: "USA",
  },
  {
    id: "wc-2026-2",
    stage: "GROUP",
    utcKickoff: "2026-06-12T19:00:00Z",
    home: "CAN",
    away: "ENG",
  },
  {
    id: "wc-2026-final",
    stage: "FINAL",
    utcKickoff: "2026-07-19T19:00:00Z",
    home: "ARG",
    away: "FRA",
  },
] as const
