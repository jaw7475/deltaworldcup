import type { GroupLetter, TeamCode } from "@/lib/scoring/types"

export interface Team {
  code: TeamCode
  name: string
  iso2: string
  group: GroupLetter
}

/**
 * 2026 FIFA World Cup — 48 teams in 12 groups of 4.
 * Group assignments are placeholders for slots TBD via qualification/playoffs at config time.
 * Replace pending qualifiers (marked TBD_*) with actual codes once decided.
 *
 * Codes follow FIFA 3-letter convention (e.g. USA, CAN, MEX, ARG). iso2 drives flag SVGs.
 */
export const TEAMS: readonly Team[] = [
  // Group A
  { code: "CAN", name: "Canada", iso2: "ca", group: "A" },
  { code: "MEX", name: "Mexico", iso2: "mx", group: "A" },
  { code: "USA", name: "United States", iso2: "us", group: "A" },
  { code: "TBD_A4", name: "TBD (Group A)", iso2: "un", group: "A" },
  // Group B
  { code: "ARG", name: "Argentina", iso2: "ar", group: "B" },
  { code: "BRA", name: "Brazil", iso2: "br", group: "B" },
  { code: "GER", name: "Germany", iso2: "de", group: "B" },
  { code: "TBD_B4", name: "TBD (Group B)", iso2: "un", group: "B" },
  // Group C
  { code: "FRA", name: "France", iso2: "fr", group: "C" },
  { code: "ENG", name: "England", iso2: "gb-eng", group: "C" },
  { code: "ESP", name: "Spain", iso2: "es", group: "C" },
  { code: "TBD_C4", name: "TBD (Group C)", iso2: "un", group: "C" },
  // Group D
  { code: "POR", name: "Portugal", iso2: "pt", group: "D" },
  { code: "NED", name: "Netherlands", iso2: "nl", group: "D" },
  { code: "BEL", name: "Belgium", iso2: "be", group: "D" },
  { code: "TBD_D4", name: "TBD (Group D)", iso2: "un", group: "D" },
  // Group E
  { code: "ITA", name: "Italy", iso2: "it", group: "E" },
  { code: "CRO", name: "Croatia", iso2: "hr", group: "E" },
  { code: "JPN", name: "Japan", iso2: "jp", group: "E" },
  { code: "TBD_E4", name: "TBD (Group E)", iso2: "un", group: "E" },
  // Group F
  { code: "URU", name: "Uruguay", iso2: "uy", group: "F" },
  { code: "KOR", name: "South Korea", iso2: "kr", group: "F" },
  { code: "DEN", name: "Denmark", iso2: "dk", group: "F" },
  { code: "TBD_F4", name: "TBD (Group F)", iso2: "un", group: "F" },
  // Group G
  { code: "COL", name: "Colombia", iso2: "co", group: "G" },
  { code: "SUI", name: "Switzerland", iso2: "ch", group: "G" },
  { code: "AUS", name: "Australia", iso2: "au", group: "G" },
  { code: "TBD_G4", name: "TBD (Group G)", iso2: "un", group: "G" },
  // Group H
  { code: "MAR", name: "Morocco", iso2: "ma", group: "H" },
  { code: "SEN", name: "Senegal", iso2: "sn", group: "H" },
  { code: "POL", name: "Poland", iso2: "pl", group: "H" },
  { code: "TBD_H4", name: "TBD (Group H)", iso2: "un", group: "H" },
  // Group I
  { code: "IRN", name: "Iran", iso2: "ir", group: "I" },
  { code: "ECU", name: "Ecuador", iso2: "ec", group: "I" },
  { code: "SRB", name: "Serbia", iso2: "rs", group: "I" },
  { code: "TBD_I4", name: "TBD (Group I)", iso2: "un", group: "I" },
  // Group J
  { code: "TUN", name: "Tunisia", iso2: "tn", group: "J" },
  { code: "CRC", name: "Costa Rica", iso2: "cr", group: "J" },
  { code: "WAL", name: "Wales", iso2: "gb-wls", group: "J" },
  { code: "TBD_J4", name: "TBD (Group J)", iso2: "un", group: "J" },
  // Group K
  { code: "GHA", name: "Ghana", iso2: "gh", group: "K" },
  { code: "CMR", name: "Cameroon", iso2: "cm", group: "K" },
  { code: "KSA", name: "Saudi Arabia", iso2: "sa", group: "K" },
  { code: "TBD_K4", name: "TBD (Group K)", iso2: "un", group: "K" },
  // Group L
  { code: "QAT", name: "Qatar", iso2: "qa", group: "L" },
  { code: "RSA", name: "South Africa", iso2: "za", group: "L" },
  { code: "PAR", name: "Paraguay", iso2: "py", group: "L" },
  { code: "TBD_L4", name: "TBD (Group L)", iso2: "un", group: "L" },
] as const

const TEAMS_BY_CODE = new Map<TeamCode, Team>(TEAMS.map((t) => [t.code, t]))

export function getTeam(code: TeamCode): Team | undefined {
  return TEAMS_BY_CODE.get(code)
}

// Build-time integrity check: 48 teams, 12 groups of 4, no duplicate codes.
;(function validateTeams() {
  if (TEAMS.length !== 48) {
    throw new Error(`TEAMS must have 48 entries (got ${TEAMS.length})`)
  }
  if (TEAMS_BY_CODE.size !== 48) {
    throw new Error("TEAMS contains duplicate codes")
  }
  const byGroup = new Map<GroupLetter, number>()
  for (const t of TEAMS) {
    byGroup.set(t.group, (byGroup.get(t.group) ?? 0) + 1)
  }
  for (const g of ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const) {
    if (byGroup.get(g) !== 4) {
      throw new Error(`Group ${g} must have exactly 4 teams (got ${byGroup.get(g) ?? 0})`)
    }
  }
})()
