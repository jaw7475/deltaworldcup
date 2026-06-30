import { z } from "zod"
import type { Match, Stage, MatchStatus } from "@/lib/scoring/types"
import type {
  FootballDataProvider,
  MatchDetail,
  GoalEvent,
  ScorerEntry,
} from "./types"

const BASE = "https://api.football-data.org/v4"

// football-data.org v4 response shape (the bits we use).
const scoreSchema = z
  .object({
    home: z.number().nullable(),
    away: z.number().nullable(),
  })
  .nullable()

const teamSchema = z.object({
  id: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  shortName: z.string().nullable().optional(),
  tla: z.string().nullable().optional(),
})

const matchSchema = z.object({
  id: z.number(),
  utcDate: z.string(),
  status: z.string(),
  stage: z.string(),
  minute: z.number().nullable().optional(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: z.object({
    winner: z
      .union([z.literal("HOME_TEAM"), z.literal("AWAY_TEAM"), z.literal("DRAW")])
      .nullable()
      .optional(),
    duration: z.string().optional(), // "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT"
    fullTime: scoreSchema,
    regularTime: scoreSchema.optional(),
    extraTime: scoreSchema.optional(),
    penalties: scoreSchema.optional(),
  }),
})

const responseSchema = z.object({
  matches: z.array(matchSchema),
})

const goalSchema = z.object({
  minute: z.number().nullable().optional(),
  injuryTime: z.number().nullable().optional(),
  type: z.string().optional(),
  team: z
    .object({
      tla: z.string().nullable().optional(),
      shortName: z.string().nullable().optional(),
    })
    .optional(),
  scorer: z
    .object({
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

const matchDetailResponseSchema = z.object({
  id: z.number(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  goals: z.array(goalSchema).optional(),
})

const scorerEntrySchema = z.object({
  player: z.object({
    name: z.string(),
  }),
  team: teamSchema,
  goals: z.number(),
  assists: z.number().nullable().optional(),
  penalties: z.number().nullable().optional(),
  playedMatches: z.number().optional(),
})

const scorersResponseSchema = z.object({
  scorers: z.array(scorerEntrySchema),
})

// football-data.org sends ISO 3166-1 alpha-3 codes; we use FIFA codes. The two
// agree for 47/48 of the 2026 qualifiers — Uruguay (FIFA: URU, ISO: URY) is the
// outlier. Add more entries here if future qualifiers diverge.
const TLA_REMAP: Record<string, string> = {
  URY: "URU",
}

const STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: "GROUP",
  ROUND_OF_32: "R32",
  ROUND_OF_16: "R16",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
}

function mapStage(raw: string): Stage {
  const mapped = STAGE_MAP[raw]
  if (mapped) return mapped
  // Anything unmapped is more likely a knockout stage we haven't named yet
  // than a group match — falling back to GROUP poisons group-inference.
  return raw === "GROUP_STAGE" ? "GROUP" : "R32"
}

function mapStatus(s: string): MatchStatus {
  switch (s) {
    case "FINISHED":
      return "FINISHED"
    case "IN_PLAY":
    case "PAUSED":
    case "HALFTIME":
    case "LIVE":
      return "LIVE"
    case "POSTPONED":
    case "SUSPENDED":
    case "CANCELLED":
    case "AWARDED":
      return "POSTPONED"
    default:
      return "SCHEDULED"
  }
}

export class FootballDataApiProvider implements FootballDataProvider {
  constructor(
    private readonly token: string,
    private readonly competition: string = "WC"
  ) {}

  async fetchAllMatches(): Promise<Match[]> {
    const res = await fetch(`${BASE}/competitions/${this.competition}/matches`, {
      headers: { "X-Auth-Token": this.token },
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(
        `football-data: ${res.status} ${res.statusText} — competition=${this.competition}`
      )
    }
    const json = await res.json()
    const parsed = responseSchema.parse(json)

    return parsed.matches.map((m): Match => {
      const status = mapStatus(m.status)
      const stage = mapStage(m.stage)
      const rawHome = m.homeTeam.tla ?? m.homeTeam.shortName ?? `T${m.homeTeam.id}`
      const rawAway = m.awayTeam.tla ?? m.awayTeam.shortName ?? `T${m.awayTeam.id}`
      const home = TLA_REMAP[rawHome] ?? rawHome
      const away = TLA_REMAP[rawAway] ?? rawAway
      const ft = m.score.fullTime
      const pens = m.score.penalties
      const et = m.score.extraTime
      const wentToExtraTime = !!et && et.home !== null && et.away !== null
      const wentToPenalties = !!pens && pens.home !== null && pens.away !== null

      // football-data.org rolls the shootout into `score.fullTime` for PK
      // matches (e.g. a 1-1(4-3) match returns fullTime 5-4). Our `fullTime`
      // must be end-of-ET-if-played-else-90 with shootout goals stripped —
      // it's what feeds the GF tiebreaker. Subtract the penalty shootout
      // score when present.
      const ftHome =
        ft && ft.home !== null && ft.away !== null
          ? wentToPenalties && pens && pens.home !== null && pens.away !== null
            ? ft.home - pens.home
            : ft.home
          : null
      const ftAway =
        ft && ft.home !== null && ft.away !== null
          ? wentToPenalties && pens && pens.home !== null && pens.away !== null
            ? ft.away - pens.away
            : ft.away
          : null

      const fullTime =
        status === "FINISHED" && ftHome !== null && ftAway !== null
          ? { home: ftHome, away: ftAway }
          : undefined

      const currentScore =
        ftHome !== null && ftAway !== null
          ? { home: ftHome, away: ftAway }
          : { home: 0, away: 0 }

      const winner =
        status === "FINISHED"
          ? m.score.winner === "HOME_TEAM"
            ? home
            : m.score.winner === "AWAY_TEAM"
              ? away
              : null
          : null

      return {
        id: String(m.id),
        stage,
        utcKickoff: m.utcDate,
        status,
        minute: m.minute ?? undefined,
        home,
        away,
        currentScore,
        fullTime,
        penalties:
          pens && pens.home !== null && pens.away !== null
            ? { home: pens.home, away: pens.away }
            : undefined,
        wentToExtraTime,
        wentToPenalties,
        winner,
      }
    })
  }

  async fetchMatchDetail(matchId: string): Promise<MatchDetail> {
    const res = await fetch(`${BASE}/matches/${matchId}`, {
      headers: { "X-Auth-Token": this.token },
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(
        `football-data match detail: ${res.status} ${res.statusText} — id=${matchId}`
      )
    }
    const json = await res.json()
    const parsed = matchDetailResponseSchema.parse(json)
    const goals: GoalEvent[] = []
    for (const g of parsed.goals ?? []) {
      const rawTla = g.team?.tla ?? g.team?.shortName ?? ""
      const team = TLA_REMAP[rawTla] ?? rawTla
      const scorer = g.scorer?.name ?? "(unknown)"
      const minute = g.minute ?? 0
      const type = (g.type ?? "").toUpperCase()
      goals.push({
        team,
        scorer,
        minute,
        isOwnGoal: type === "OWN" || type === "OWN_GOAL",
        isPenalty: type === "PENALTY",
      })
    }
    return { matchId: String(parsed.id), goals }
  }

  async fetchTopScorers(): Promise<ScorerEntry[]> {
    const res = await fetch(
      `${BASE}/competitions/${this.competition}/scorers?limit=100`,
      {
        headers: { "X-Auth-Token": this.token },
        cache: "no-store",
      }
    )
    if (!res.ok) {
      throw new Error(
        `football-data scorers: ${res.status} ${res.statusText} — competition=${this.competition}`
      )
    }
    const json = await res.json()
    const parsed = scorersResponseSchema.parse(json)
    return parsed.scorers.map((s): ScorerEntry => {
      const rawTla = s.team.tla ?? s.team.shortName ?? ""
      const team = TLA_REMAP[rawTla] ?? rawTla
      return {
        name: s.player.name,
        team,
        goals: s.goals,
        assists: s.assists ?? null,
        penalties: s.penalties ?? null,
        playedMatches: s.playedMatches ?? 0,
      }
    })
  }
}
