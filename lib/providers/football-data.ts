import { z } from "zod"
import type { Match, Stage, MatchStatus } from "@/lib/scoring/types"
import type { FootballDataProvider } from "./types"

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

// football-data.org sends ISO 3166-1 alpha-3 codes; we use FIFA codes. The two
// agree for 47/48 of the 2026 qualifiers — Uruguay (FIFA: URU, ISO: URY) is the
// outlier. Add more entries here if future qualifiers diverge.
const TLA_REMAP: Record<string, string> = {
  URY: "URU",
}

const STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: "GROUP",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
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
      const stage = STAGE_MAP[m.stage] ?? "GROUP"
      const rawHome = m.homeTeam.tla ?? m.homeTeam.shortName ?? `T${m.homeTeam.id}`
      const rawAway = m.awayTeam.tla ?? m.awayTeam.shortName ?? `T${m.awayTeam.id}`
      const home = TLA_REMAP[rawHome] ?? rawHome
      const away = TLA_REMAP[rawAway] ?? rawAway
      const ft = m.score.fullTime
      const pens = m.score.penalties
      const et = m.score.extraTime
      const wentToExtraTime = !!et && et.home !== null && et.away !== null
      const wentToPenalties = !!pens && pens.home !== null && pens.away !== null

      const fullTime =
        status === "FINISHED" && ft && ft.home !== null && ft.away !== null
          ? { home: ft.home, away: ft.away }
          : undefined

      const currentScore =
        ft && ft.home !== null && ft.away !== null
          ? { home: ft.home, away: ft.away }
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
}
