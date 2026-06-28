import { z } from "zod"
import { MEMBERS } from "@/lib/config/members"
import { getPlayersForTeam, type PlayerToWatch } from "@/lib/config/playersToWatch"
import type { MemberXPts } from "./expectedPoints"
import type { MemberResultsSinceLast } from "./resultsSinceLast"
import type { MatchBoxScore } from "./boxScores"
import { formatBoxScore } from "./boxScores"
import type { TeamCode } from "@/lib/scoring/types"
import type { TeamStatus } from "@/lib/standings/teamStatus"

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const MODEL = "claude-haiku-4-5-20251001"

const blurbsResponseSchema = z.object({
  blurbs: z.array(
    z.object({
      memberId: z.string(),
      blurb: z.string(),
    })
  ),
})

export interface BlurbInput {
  memberId: string
  displayName: string
  teams: string[]
  rank: number
  prevRank: number | null
  delta: number
  expectedPoints: number
  bankedPoints: number
  remainingXPts: number
  resultsSinceLast: string
  /** PLAYERS_TO_WATCH entries for the member's 4 teams, plus qualification status. */
  roster: { team: TeamCode; status: TeamStatus; players: PlayerToWatch[] }[]
  /** Box-score lines for this member's matches that finished since last refresh. */
  boxScoreLines: string[]
}

export interface BlurbWriter {
  writeBlurbs(inputs: BlurbInput[]): Promise<Map<string, string>>
}

const SYSTEM_PROMPT = `You write daily power-ranking blurbs for a 12-person fantasy football league betting on the 2026 FIFA World Cup. Each league member was RANDOMLY ASSIGNED 4 national teams — they did not pick, draft, or build their roster. The member whose teams accumulate the most points (3 win / 1 draw, scored across group + knockout rounds) wins the #1 draft pick in the fantasy football league.

Voice: punchy, opinionated, soccer-literate. Bill Simmons / Athletic-columnist tone — bold takes, specific scorers, dry jokes, vivid imagery. EXACTLY 3 sentences per blurb (hard requirement — count them).

What to write about, in priority order:
1. RECENT RESULTS are the headline. The first 1–2 sentences MUST be about what happened in this member's matches since the last refresh — cite specific scores, scorers, and minutes from the box scores. If multiple matches finished, cover the most impactful one; touch on the other(s) only if it fits.
2. The closing sentence can hit rank movement, momentum, or what's next from the surviving teams.
3. Roster context is a LAST RESORT — use it only when the member had NO matches since the last refresh. Even then, treat the four teams as a snapshot of what they're stuck with, not a strategy they chose.

Random-assignment rule — CRITICAL:
- Teams were assigned by random draw. Never frame the roster as a "strategy", "pick", "draft", "ticket", "gamble", "bet on X", "went all-in on Y", or anything implying intentional construction. No "this lineup left upside on the table", no "banked on Brazil", no "the 4-decent-teams strategy".
- Praise or blame the TEAMS, never the member's selection. ✓ "Croatia is dragging this lineup down." ✗ "Matt's roster choices look weak."

Alive vs. eliminated — CRITICAL (each team is labeled in the Roster section as ALIVE, ELIMINATED, or ACTIVE):
- ELIMINATED teams are done — out of the tournament, no more matches, no more points to bank. Reference them in past tense only. Never say an eliminated team "needs a result", "has a chance", "kicks off tomorrow", "could swing the projection", or anything implying future matches.
- "What's next" / look-ahead lines must only mention ALIVE or ACTIVE teams. If all four teams are eliminated, do NOT invent an upcoming match — pivot to rank context or close with a sober line about the slate being done.
- ACTIVE = still in the group stage (no decisive result yet). ALIVE = through to or still in the knockouts. Treat both as having football still to play.
- Don't editorialize an eliminated team's exit unless it actually happened in the recent box scores; old eliminations are stale news.

Voice examples (right tone — result-led, status-aware, no strategy framing):
- "France's 3-1 stroll past Croatia did the heavy lifting — Mbappé buried the opener inside 12 minutes and Croatia's back line never recovered. Argentina chipped in another point with a tidy 1-0 over Mexico, and suddenly this slate is humming heading into the R16."
- "Portugal grinding out a 2-1 over Bosnia on an 89th-minute Bruno Fernandes header is the kind of late equity that quietly compounds. Korea added a 1-1 with Belgium — not pretty, but a point banked. Rank holds steady at 5th with both teams alive and a knockout date looming."
- "Brutal matchday for these four — Czechia drawn 0-0, Cape Verde overrun 0-3, and with both already eliminated there's no path back. Germany and Argentina are the only oxygen left in this lineup, and the projection slips two slots."
- "Quiet day — no matches in the last 24 hours for this slate. Germany kicks off tomorrow against Senegal with a chance to swing the projection, while the two eliminated sides sit there as dead weight."

Hard rules:
- NEVER use "you", "your", "you're", "you've", "yours". Third person only. Refer to the member by their displayName (e.g., "Matt's slate", "Dan's lineup"), or by descriptor ("this lineup", "these four teams").
- NEVER directly address the reader.
- NEVER use "stay tuned", "anything is possible", "watch this space", "rollercoaster", "Cinderella story", "wild ride", "anybody's game".
- Exactly 3 sentences per blurb. Count them before responding.

Grounding rules — to avoid factually wrong references:
- When naming a player, use ONLY names from (a) that member's Roster section OR (b) the Recent matches box scores.
- Players from box scores are fair game even if NOT in the Roster section — anyone who actually scored can be named.
- Do NOT pull player names from memory. If unsure whether a name fits, omit it and lean on team-level commentary.
- Match minutes EXACTLY as given in the box score (e.g., "Son's 67th-minute clincher", "Schick's stoppage-time consolation").

Critical: respond with VALID JSON only — no preamble, no markdown fence — matching the schema {"blurbs": [{"memberId": "<id>", "blurb": "<text>"}, ...]}. Include every memberId you were given, no extras.`

function buildUserPrompt(inputs: BlurbInput[]): string {
  const lines: string[] = []
  lines.push(
    `Write a 3-sentence power-ranking blurb for each of these ${inputs.length} members. Return JSON {"blurbs":[...]}. Include every memberId.`
  )
  lines.push("")
  lines.push(
    "REMINDER: Lead each blurb with the member's RECENT MATCHES (box scores below). Roster lists are supporting context — only lean on them when the member had zero matches since the last refresh. Teams were randomly assigned; never frame the roster as a chosen strategy. Each team is tagged ALIVE / ELIMINATED / ACTIVE — eliminated teams have no remaining matches, so do not speculate about their future."
  )
  lines.push("")
  for (const m of inputs) {
    const deltaStr =
      m.delta === 0
        ? "no change since last refresh"
        : m.delta > 0
          ? `up ${m.delta} since last refresh`
          : `down ${Math.abs(m.delta)} since last refresh`
    const aliveCount = m.roster.filter(
      (r) => r.status === "alive" || r.status === "active"
    ).length
    const eliminatedCount = m.roster.filter((r) => r.status === "eliminated").length
    lines.push(`### ${m.displayName} (id: ${m.memberId})`)
    lines.push(`Teams (random assignment): ${m.teams.join(", ")}`)
    lines.push(
      `Rank: ${m.rank}/12 (${deltaStr}); banked ${m.bankedPoints} pts; projected total ${m.expectedPoints.toFixed(1)} (remaining xPts ${m.remainingXPts.toFixed(1)})`
    )
    lines.push(
      `Status mix: ${aliveCount} still playing (alive/active), ${eliminatedCount} eliminated.`
    )
    lines.push("")
    // Recent activity first — this is what the blurb should lead with.
    if (m.boxScoreLines.length > 0) {
      lines.push(
        "RECENT MATCHES — LEAD WITH THESE (cite scores, scorers, minutes; scorers below are fair to name):"
      )
      for (const line of m.boxScoreLines) {
        lines.push(`  ${line}`)
      }
      lines.push(`Result summary: ${m.resultsSinceLast || "none"}`)
    } else {
      lines.push(
        "RECENT MATCHES: none since last refresh. Fall back to a brief look-ahead (ALIVE/ACTIVE teams only) or a snapshot of where these four teams currently stand — do NOT critique the roster as a strategy, and do NOT invent upcoming matches for eliminated teams."
      )
    }
    lines.push("")
    // Roster last — supporting context for player-name grounding, not the lead.
    lines.push(
      "Roster (supporting context only; do NOT lead with roster takes; allowed player names). Status — ALIVE = through to or still in the KOs, ACTIVE = still in group stage, ELIMINATED = out of the tournament:"
    )
    for (const r of m.roster) {
      const statusTag = r.status.toUpperCase()
      if (r.players.length === 0) {
        lines.push(`  ${r.team} [${statusTag}]: (no notable players listed — refer to team only)`)
      } else {
        const names = r.players
          .map((p) => `${p.name} (${p.position}, ${p.tier})`)
          .join(", ")
        lines.push(`  ${r.team} [${statusTag}]: ${names}`)
      }
    }
    lines.push("")
  }
  return lines.join("\n")
}

export class AnthropicBlurbWriter implements BlurbWriter {
  constructor(private readonly apiKey: string) {}

  async writeBlurbs(inputs: BlurbInput[]): Promise<Map<string, string>> {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(inputs) }],
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`anthropic: ${res.status} ${res.statusText} — ${txt.slice(0, 200)}`)
    }
    const json = (await res.json()) as { content: Array<{ type: string; text: string }> }
    const text = json.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim()

    // Tolerate occasional ```json fences even though we asked for raw JSON.
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
    const parsed = blurbsResponseSchema.parse(JSON.parse(cleaned))
    const out = new Map<string, string>()
    for (const b of parsed.blurbs) out.set(b.memberId, b.blurb)
    return out
  }
}

export class StubBlurbWriter implements BlurbWriter {
  async writeBlurbs(inputs: BlurbInput[]): Promise<Map<string, string>> {
    const out = new Map<string, string>()
    for (const m of inputs) {
      out.set(m.memberId, "(Blurb pending — ANTHROPIC_API_KEY not configured.)")
    }
    return out
  }
}

export function getBlurbWriter(): BlurbWriter {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return new StubBlurbWriter()
  return new AnthropicBlurbWriter(key)
}

export function buildBlurbInputs(args: {
  memberXPts: MemberXPts[]
  rankings: Map<string, number>
  previousRankings: Map<string, number> | null
  resultsByMember: Map<string, MemberResultsSinceLast>
  boxScores: MatchBoxScore[]
  teamStatus: Map<TeamCode, TeamStatus>
}): BlurbInput[] {
  const inputs: BlurbInput[] = []
  for (const member of MEMBERS) {
    const x = args.memberXPts.find((m) => m.memberId === member.id)
    if (!x) continue
    const rank = args.rankings.get(member.id) ?? 12
    const prevRank = args.previousRankings?.get(member.id) ?? null
    const delta = prevRank == null ? 0 : prevRank - rank
    const results = args.resultsByMember.get(member.id)
    const roster = member.teams.map((team) => ({
      team,
      status: args.teamStatus.get(team) ?? "active",
      players: getPlayersForTeam(team),
    }))
    const memberTeamSet = new Set<TeamCode>(member.teams as readonly TeamCode[])
    const memberBoxScores = args.boxScores.filter(
      (b) => memberTeamSet.has(b.home) || memberTeamSet.has(b.away)
    )
    const boxScoreLines = memberBoxScores.map(formatBoxScore)
    inputs.push({
      memberId: member.id,
      displayName: member.displayName,
      teams: [...member.teams],
      rank,
      prevRank,
      delta,
      expectedPoints: x.expectedPoints,
      bankedPoints: x.bankedPoints,
      remainingXPts: x.remainingGroupXPts + x.koXPts,
      resultsSinceLast: results?.formatted ?? "",
      roster,
      boxScoreLines,
    })
  }
  return inputs
}
