import { z } from "zod"

const BASE = "https://api.sleeper.app/v1"

/**
 * Sleeper traded pick — one entry per pick that has been traded at least once.
 * `roster_id` = the slot the pick originally belongs to (the anchor).
 * `owner_id` = the roster currently holding the pick.
 * Picks NOT in this list belong to their original slot owner.
 */
const tradedPickSchema = z.object({
  season: z.string(),
  round: z.number().int().positive(),
  roster_id: z.number().int().positive(),
  previous_owner_id: z.number().int().positive(),
  owner_id: z.number().int().positive(),
})

const userSchema = z.object({
  user_id: z.string(),
  display_name: z.string().nullable().optional(),
  metadata: z
    .object({ team_name: z.string().optional() })
    .partial()
    .nullable()
    .optional(),
})

const rosterSchema = z.object({
  roster_id: z.number().int().positive(),
  owner_id: z.string().nullable(),
})

export type SleeperTradedPick = z.infer<typeof tradedPickSchema>
export type SleeperUser = z.infer<typeof userSchema>
export type SleeperRoster = z.infer<typeof rosterSchema>

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Sleeper ${res.status} ${res.statusText} for ${url}`)
  }
  return res.json()
}

export async function getTradedPicks(
  leagueId: string
): Promise<SleeperTradedPick[]> {
  const data = await fetchJson(`${BASE}/league/${leagueId}/traded_picks`)
  return z.array(tradedPickSchema).parse(data)
}

export async function getUsers(leagueId: string): Promise<SleeperUser[]> {
  const data = await fetchJson(`${BASE}/league/${leagueId}/users`)
  return z.array(userSchema).parse(data)
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  const data = await fetchJson(`${BASE}/league/${leagueId}/rosters`)
  return z.array(rosterSchema).parse(data)
}
