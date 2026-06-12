import { z } from "zod"
import type { TeamCode } from "@/lib/scoring/types"
import type { MatchProbabilities } from "@/lib/powerRankings/types"
import { TEAMS } from "@/lib/config/teams"

const BASE = "https://api.the-odds-api.com/v4"
const SPORT_KEY = "soccer_fifa_world_cup"

const outcomeSchema = z.object({
  name: z.string(),
  price: z.number(),
})

const marketSchema = z.object({
  key: z.string(),
  outcomes: z.array(outcomeSchema),
})

const bookmakerSchema = z.object({
  key: z.string(),
  title: z.string(),
  markets: z.array(marketSchema),
})

const oddsEventSchema = z.object({
  id: z.string(),
  sport_key: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(bookmakerSchema),
})

const oddsResponseSchema = z.array(oddsEventSchema)

/**
 * Convert raw bookmaker decimal odds (W/D/L) to implied probabilities with
 * vig removed. We pick the bookmaker with the lowest total overround (= tightest
 * margin = closest to "true" probabilities), then renormalise.
 */
function impliedProbabilities(
  bookmakers: z.infer<typeof bookmakerSchema>[],
  homeName: string,
  awayName: string
): { pHome: number; pDraw: number; pAway: number } | null {
  let best: { pHome: number; pDraw: number; pAway: number; overround: number } | null = null

  for (const b of bookmakers) {
    const h2h = b.markets.find((m) => m.key === "h2h")
    if (!h2h) continue
    const home = h2h.outcomes.find((o) => o.name === homeName)
    const away = h2h.outcomes.find((o) => o.name === awayName)
    const draw = h2h.outcomes.find((o) => o.name === "Draw")
    if (!home || !away || !draw) continue

    const rawHome = 1 / home.price
    const rawDraw = 1 / draw.price
    const rawAway = 1 / away.price
    const overround = rawHome + rawDraw + rawAway
    if (overround <= 0) continue

    const candidate = {
      pHome: rawHome / overround,
      pDraw: rawDraw / overround,
      pAway: rawAway / overround,
      overround,
    }
    if (!best || candidate.overround < best.overround) best = candidate
  }

  if (!best) return null
  const { pHome, pDraw, pAway } = best
  return { pHome, pDraw, pAway }
}

// The Odds API returns full team names ("Uruguay", "United States", "South Korea").
// Build a lookup from name → our FIFA TeamCode. Some teams have variants.
const NAME_ALIASES: Record<string, string> = {
  "United States": "USA",
  USA: "USA",
  "South Korea": "KOR",
  Korea: "KOR",
  "Republic of Korea": "KOR",
  Türkiye: "TUR",
  Turkey: "TUR",
  "DR Congo": "COD",
  "DR Congo (Congo Kinshasa)": "COD",
  Czechia: "CZE",
  "Czech Republic": "CZE",
  "Bosnia & Herzegovina": "BIH",
  "Bosnia and Herzegovina": "BIH",
  "Cape Verde": "CPV",
  "Cabo Verde": "CPV",
  "Ivory Coast": "CIV",
  "Cote d'Ivoire": "CIV",
  "Côte d'Ivoire": "CIV",
  Iran: "IRN",
  "South Africa": "RSA",
  "Saudi Arabia": "KSA",
  "New Zealand": "NZL",
}

function teamNameToCode(name: string): TeamCode | null {
  if (NAME_ALIASES[name]) return NAME_ALIASES[name]
  const exact = TEAMS.find((t) => t.name === name)
  if (exact) return exact.code
  return null
}

export interface OddsProvider {
  fetchMatchProbabilities(): Promise<MatchProbabilities[]>
}

export class TheOddsApiProvider implements OddsProvider {
  constructor(private readonly apiKey: string) {}

  async fetchMatchProbabilities(): Promise<MatchProbabilities[]> {
    const url = new URL(`${BASE}/sports/${SPORT_KEY}/odds`)
    url.searchParams.set("apiKey", this.apiKey)
    url.searchParams.set("regions", "us,uk,eu")
    url.searchParams.set("markets", "h2h")
    url.searchParams.set("oddsFormat", "decimal")
    url.searchParams.set("dateFormat", "iso")

    const res = await fetch(url.toString(), { cache: "no-store" })
    if (!res.ok) {
      throw new Error(
        `the-odds-api: ${res.status} ${res.statusText} (remaining quota: ${res.headers.get("x-requests-remaining") ?? "?"})`
      )
    }
    const json = await res.json()
    const parsed = oddsResponseSchema.parse(json)

    const out: MatchProbabilities[] = []
    for (const e of parsed) {
      const home = teamNameToCode(e.home_team)
      const away = teamNameToCode(e.away_team)
      if (!home || !away) continue // skip events with teams not in our roster
      const probs = impliedProbabilities(e.bookmakers, e.home_team, e.away_team)
      if (!probs) continue
      out.push({
        matchId: e.id,
        homeTeam: home,
        awayTeam: away,
        pHome: probs.pHome,
        pDraw: probs.pDraw,
        pAway: probs.pAway,
      })
    }
    return out
  }
}

export class StubOddsProvider implements OddsProvider {
  async fetchMatchProbabilities(): Promise<MatchProbabilities[]> {
    return []
  }
}

export function getOddsProvider(): OddsProvider {
  const key = process.env.ODDS_API_KEY
  if (!key) return new StubOddsProvider()
  return new TheOddsApiProvider(key)
}
