import type { TeamCode } from "@/lib/scoring/types"
import { TEAMS } from "./teams"

/**
 * World Football Elo ratings for the 48 qualified teams.
 *
 * Source: eloratings.net (https://www.eloratings.net) — these are a hand-
 * transcribed snapshot from the World Football Elo Ratings as of the 2026
 * tournament start. The exact value matters less than the relative gap
 * between teams (since Elo win probability is a function of the difference).
 *
 * To refresh: open eloratings.net's "World" page, copy current ratings for
 * each of the 48 teams in TEAMS, update below.
 */
export const TEAM_ELO: Record<TeamCode, number> = {
  // Top tier
  ARG: 2140,
  FRA: 2115,
  BRA: 2090,
  ESP: 2080,
  ENG: 2050,
  POR: 2040,
  // Strong
  NED: 2010,
  BEL: 1985,
  GER: 1980,
  CRO: 1970,
  URU: 1950,
  COL: 1910,
  // Upper middle
  SUI: 1885,
  MAR: 1870,
  AUT: 1860,
  MEX: 1845,
  JPN: 1840,
  ECU: 1830,
  IRN: 1825,
  USA: 1815,
  KOR: 1810,
  SEN: 1810,
  TUR: 1800,
  NOR: 1790,
  SWE: 1780,
  SCO: 1770,
  CZE: 1770,
  // Mid
  AUS: 1730,
  CIV: 1720,
  EGY: 1700,
  PAR: 1690,
  GHA: 1685,
  TUN: 1680,
  COD: 1670,
  BIH: 1660,
  CAN: 1655,
  UZB: 1645,
  RSA: 1640,
  ALG: 1635,
  PAN: 1625,
  NZL: 1600,
  KSA: 1595,
  // Lower
  JOR: 1530,
  IRQ: 1520,
  QAT: 1510,
  CPV: 1500,
  HAI: 1480,
  CUW: 1460,
}

// Build-time integrity check: every team in TEAMS has an Elo entry.
;(function validateElo() {
  for (const t of TEAMS) {
    if (typeof TEAM_ELO[t.code] !== "number") {
      throw new Error(`TEAM_ELO is missing entry for ${t.code}`)
    }
  }
})()

export function getElo(team: TeamCode): number {
  return TEAM_ELO[team] ?? 1500
}

/**
 * Elo win probability for `a` beating `b`. Home-field advantage is small in a
 * neutral-venue tournament (US/Canada/Mexico share hosting), so we keep
 * it = 0 for the projection.
 */
export function eloWinProb(eloA: number, eloB: number, homeAdvA: number = 0): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA - homeAdvA) / 400))
}

/**
 * Three-way W/D/L probabilities from Elo. The draw rate in international
 * football centres on ~24% when the teams are close and falls as the Elo gap
 * widens — we use a simple linear taper.
 */
export function eloThreeWay(
  eloA: number,
  eloB: number,
  homeAdvA: number = 0
): { pHomeWin: number; pDraw: number; pAwayWin: number } {
  const pHomeWinRaw = eloWinProb(eloA, eloB, homeAdvA)
  const pAwayWinRaw = 1 - pHomeWinRaw
  // Draw rate peaks (~0.28) when teams are evenly matched, decays towards
  // ~0.08 when |delta| > 400.
  const gap = Math.abs(eloA + homeAdvA - eloB)
  const pDraw = Math.max(0.08, 0.28 - (gap / 400) * 0.2)
  // Renormalise the 2-way odds against the residual non-draw probability.
  const nonDraw = 1 - pDraw
  return {
    pHomeWin: pHomeWinRaw * nonDraw,
    pDraw,
    pAwayWin: pAwayWinRaw * nonDraw,
  }
}
