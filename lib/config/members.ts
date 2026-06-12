import type { TeamCode } from "@/lib/scoring/types"
import { TEAMS } from "@/lib/config/teams"

export interface Member {
  id: string
  displayName: string
  teams: [TeamCode, TeamCode, TeamCode, TeamCode]
  /** Optional accent color for the row glow. Defaults to neon cyan. */
  accentColor?: string
}

/**
 * 12 league members, each holding 4 teams from the 2026 FIFA World Cup draw.
 * Source: league spreadsheet (see Image attached to the conversation that
 * introduced these assignments).
 */
export const MEMBERS: readonly Member[] = [
  {
    id: "matt",
    displayName: "Matt",
    teams: ["ENG", "JPN", "EGY", "UZB"],
    accentColor: "#00f5d4",
  },
  {
    id: "zach-m",
    displayName: "Zach M",
    teams: ["BRA", "USA", "ALG", "RSA"],
    accentColor: "#fee440",
  },
  {
    id: "josh-g-andrew-b",
    displayName: "Josh G / Andrew B",
    teams: ["ESP", "SEN", "PAR", "KSA"],
    accentColor: "#ff006e",
  },
  {
    id: "jesse",
    displayName: "Jesse",
    teams: ["COL", "IRN", "SWE", "IRQ"],
    accentColor: "#b16cff",
  },
  {
    id: "spencer",
    displayName: "Spencer",
    teams: ["NED", "TUR", "COD", "QAT"],
    accentColor: "#9bff66",
  },
  {
    id: "jake",
    displayName: "Jake",
    teams: ["GER", "AUT", "CAN", "CPV"],
    accentColor: "#7dd3fc",
  },
  {
    id: "zach-d",
    displayName: "Zach D",
    teams: ["FRA", "SUI", "NOR", "CUW"],
    accentColor: "#00f5d4",
  },
  {
    id: "josh-w",
    displayName: "Josh W",
    teams: ["CRO", "URU", "CZE", "BIH"],
    accentColor: "#fee440",
  },
  {
    id: "danny",
    displayName: "Danny",
    teams: ["ARG", "MEX", "PAN", "NZL"],
    accentColor: "#ff006e",
  },
  {
    id: "zach-f",
    displayName: "Zach F",
    teams: ["MAR", "ECU", "SCO", "JOR"],
    accentColor: "#b16cff",
  },
  {
    id: "dan",
    displayName: "Dan",
    teams: ["POR", "KOR", "TUN", "GHA"],
    accentColor: "#9bff66",
  },
  {
    id: "andrew-s",
    displayName: "Andrew S",
    teams: ["BEL", "AUS", "CIV", "HAI"],
    accentColor: "#7dd3fc",
  },
] as const

const MEMBERS_BY_ID = new Map<string, Member>(MEMBERS.map((m) => [m.id, m]))

export function getMember(id: string): Member | undefined {
  return MEMBERS_BY_ID.get(id)
}

export function getMemberForTeam(team: TeamCode): Member | undefined {
  return MEMBERS.find((m) => m.teams.includes(team))
}

// Build-time integrity check:
//  - 12 members
//  - 4 teams each, all distinct
//  - every team is in TEAMS
//  - every team is assigned exactly once across the whole league
//  - all 48 TEAMS entries are covered
;(function validateMembers() {
  if (MEMBERS.length !== 12) {
    throw new Error(`MEMBERS must have 12 entries (got ${MEMBERS.length})`)
  }
  if (MEMBERS_BY_ID.size !== 12) {
    throw new Error("MEMBERS contains duplicate ids")
  }
  const validTeamCodes = new Set(TEAMS.map((t) => t.code))
  const assignmentCount = new Map<TeamCode, number>()
  for (const m of MEMBERS) {
    if (m.teams.length !== 4) {
      throw new Error(`Member ${m.id} must have exactly 4 teams (got ${m.teams.length})`)
    }
    const seen = new Set<TeamCode>()
    for (const t of m.teams) {
      if (!validTeamCodes.has(t)) {
        throw new Error(`Member ${m.id} has unknown team code "${t}"`)
      }
      if (seen.has(t)) {
        throw new Error(`Member ${m.id} has duplicate team "${t}"`)
      }
      seen.add(t)
      assignmentCount.set(t, (assignmentCount.get(t) ?? 0) + 1)
    }
  }
  for (const t of TEAMS) {
    const n = assignmentCount.get(t.code) ?? 0
    if (n === 0) {
      throw new Error(`Team ${t.code} is not assigned to any member`)
    }
    if (n > 1) {
      throw new Error(`Team ${t.code} is assigned to ${n} members`)
    }
  }
})()
