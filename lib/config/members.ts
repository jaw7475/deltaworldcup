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
 * 12 league members, each holding 4 teams.
 * REPLACE THIS PLACEHOLDER LIST with the actual league + draw results before launch.
 *
 * Assignments below allocate every one of the 48 TEAMS entries exactly once,
 * which the build-time validator enforces.
 */
export const MEMBERS: readonly Member[] = [
  {
    id: "member-1",
    displayName: "Member 1",
    teams: ["CAN", "ARG", "FRA", "POR"],
    accentColor: "#00f5d4",
  },
  {
    id: "member-2",
    displayName: "Member 2",
    teams: ["MEX", "BRA", "ENG", "NED"],
    accentColor: "#ff006e",
  },
  {
    id: "member-3",
    displayName: "Member 3",
    teams: ["USA", "GER", "ESP", "BEL"],
    accentColor: "#fee440",
  },
  {
    id: "member-4",
    displayName: "Member 4",
    teams: ["TBD_A4", "TBD_B4", "TBD_C4", "TBD_D4"],
    accentColor: "#b16cff",
  },
  {
    id: "member-5",
    displayName: "Member 5",
    teams: ["ITA", "URU", "COL", "MAR"],
    accentColor: "#9bff66",
  },
  {
    id: "member-6",
    displayName: "Member 6",
    teams: ["CRO", "KOR", "SUI", "SEN"],
    accentColor: "#7dd3fc",
  },
  {
    id: "member-7",
    displayName: "Member 7",
    teams: ["JPN", "DEN", "AUS", "POL"],
    accentColor: "#ff006e",
  },
  {
    id: "member-8",
    displayName: "Member 8",
    teams: ["TBD_E4", "TBD_F4", "TBD_G4", "TBD_H4"],
    accentColor: "#fee440",
  },
  {
    id: "member-9",
    displayName: "Member 9",
    teams: ["IRN", "TUN", "GHA", "QAT"],
    accentColor: "#00f5d4",
  },
  {
    id: "member-10",
    displayName: "Member 10",
    teams: ["ECU", "CRC", "CMR", "RSA"],
    accentColor: "#b16cff",
  },
  {
    id: "member-11",
    displayName: "Member 11",
    teams: ["SRB", "WAL", "KSA", "PAR"],
    accentColor: "#9bff66",
  },
  {
    id: "member-12",
    displayName: "Member 12",
    teams: ["TBD_I4", "TBD_J4", "TBD_K4", "TBD_L4"],
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
