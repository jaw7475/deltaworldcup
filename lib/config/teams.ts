import type { GroupLetter, TeamCode } from "@/lib/scoring/types"

export interface Team {
  code: TeamCode
  name: string
  iso2: string
  /** WC group letter (A–L). Optional until the official 2026 draw is encoded. */
  group?: GroupLetter
}

/**
 * 48 teams competing in the 2026 FIFA World Cup, as drawn by the Delta Fantasy
 * Football League. Codes follow FIFA 3-letter convention. iso2 drives flag
 * SVGs (incl. gb-eng / gb-sct from flagcdn.com).
 */
export const TEAMS: readonly Team[] = [
  // Matt
  { code: "ENG", name: "England", iso2: "gb-eng" },
  { code: "JPN", name: "Japan", iso2: "jp" },
  { code: "EGY", name: "Egypt", iso2: "eg" },
  { code: "UZB", name: "Uzbekistan", iso2: "uz" },
  // Zach M
  { code: "BRA", name: "Brazil", iso2: "br" },
  { code: "USA", name: "United States", iso2: "us" },
  { code: "ALG", name: "Algeria", iso2: "dz" },
  { code: "RSA", name: "South Africa", iso2: "za" },
  // Josh G / Andrew B
  { code: "ESP", name: "Spain", iso2: "es" },
  { code: "SEN", name: "Senegal", iso2: "sn" },
  { code: "PAR", name: "Paraguay", iso2: "py" },
  { code: "KSA", name: "Saudi Arabia", iso2: "sa" },
  // Jesse
  { code: "COL", name: "Colombia", iso2: "co" },
  { code: "IRN", name: "Iran", iso2: "ir" },
  { code: "SWE", name: "Sweden", iso2: "se" },
  { code: "IRQ", name: "Iraq", iso2: "iq" },
  // Spencer
  { code: "NED", name: "Netherlands", iso2: "nl" },
  { code: "TUR", name: "Türkiye", iso2: "tr" },
  { code: "COD", name: "DR Congo", iso2: "cd" },
  { code: "QAT", name: "Qatar", iso2: "qa" },
  // Jake
  { code: "GER", name: "Germany", iso2: "de" },
  { code: "AUT", name: "Austria", iso2: "at" },
  { code: "CAN", name: "Canada", iso2: "ca" },
  { code: "CPV", name: "Cape Verde", iso2: "cv" },
  // Zach D
  { code: "FRA", name: "France", iso2: "fr" },
  { code: "SUI", name: "Switzerland", iso2: "ch" },
  { code: "NOR", name: "Norway", iso2: "no" },
  { code: "CUW", name: "Curaçao", iso2: "cw" },
  // Josh W
  { code: "CRO", name: "Croatia", iso2: "hr" },
  { code: "URU", name: "Uruguay", iso2: "uy" },
  { code: "CZE", name: "Czechia", iso2: "cz" },
  { code: "BIH", name: "Bosnia & Herzegovina", iso2: "ba" },
  // Danny
  { code: "ARG", name: "Argentina", iso2: "ar" },
  { code: "MEX", name: "Mexico", iso2: "mx" },
  { code: "PAN", name: "Panama", iso2: "pa" },
  { code: "NZL", name: "New Zealand", iso2: "nz" },
  // Zach F
  { code: "MAR", name: "Morocco", iso2: "ma" },
  { code: "ECU", name: "Ecuador", iso2: "ec" },
  { code: "SCO", name: "Scotland", iso2: "gb-sct" },
  { code: "JOR", name: "Jordan", iso2: "jo" },
  // Dan
  { code: "POR", name: "Portugal", iso2: "pt" },
  { code: "KOR", name: "South Korea", iso2: "kr" },
  { code: "TUN", name: "Tunisia", iso2: "tn" },
  { code: "GHA", name: "Ghana", iso2: "gh" },
  // Andrew S
  { code: "BEL", name: "Belgium", iso2: "be" },
  { code: "AUS", name: "Australia", iso2: "au" },
  { code: "CIV", name: "Ivory Coast", iso2: "ci" },
  { code: "HAI", name: "Haiti", iso2: "ht" },
] as const

const TEAMS_BY_CODE = new Map<TeamCode, Team>(TEAMS.map((t) => [t.code, t]))

export function getTeam(code: TeamCode): Team | undefined {
  return TEAMS_BY_CODE.get(code)
}

// Build-time integrity check: 48 teams, no duplicate codes.
;(function validateTeams() {
  if (TEAMS.length !== 48) {
    throw new Error(`TEAMS must have 48 entries (got ${TEAMS.length})`)
  }
  if (TEAMS_BY_CODE.size !== 48) {
    throw new Error("TEAMS contains duplicate codes")
  }
})()
