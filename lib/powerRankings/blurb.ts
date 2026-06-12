import { z } from "zod"
import { MEMBERS } from "@/lib/config/members"
import type { MemberXPts } from "./expectedPoints"
import type { MemberResultsSinceLast } from "./resultsSinceLast"

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
}

export interface BlurbWriter {
  writeBlurbs(inputs: BlurbInput[]): Promise<Map<string, string>>
}

const SYSTEM_PROMPT = `You write daily power-ranking blurbs for a 12-person fantasy football league betting on the 2026 FIFA World Cup. Each league member owns 4 national teams; the member whose teams accumulate the most points (3 win / 1 draw, scored across group + knockout rounds) wins the #1 draft pick in the fantasy football league.

Voice: punchy, opinionated, soccer-literate. Think a Bill Simmons / Athletic-columnist tone — bold takes, specific player references by name, dry jokes, vivid imagery. EXACTLY 4 sentences per member (this is a hard requirement — not 2, not 3, not 5). Reference recent results when they exist (cite specific scores and minutes). Reference at least 2 of the 4 teams on the roster by name, calling out star players for at least one of them. If the rank moved up or down, work that in. Avoid clichés like "rollercoaster" or "stay tuned" or "anybody's game".

Examples of the right tone (3rd person, opinionated, specific):
- "Mbappé and Haaland on the same roster is borderline cheating, and France's 3-1 stroll past Croatia already proved the point — two of the three highest-xG attackers in world football pulling for the same draft pick."
- "This roster reads as a 4-decent-teams strategy that left no upside on the table — Czechia and Bosnia round out the most generic lineup on the board."
- "Portugal needed a late winner to beat Bosnia 2-1, which is exactly the grinding-out style this lineup is built on, and Korea grabbed a respectable 1-1 with Belgium to bank another quiet point."

Hard rules:
- NEVER use "you", "your", "you're", "you've", "yours". Always write in the third person. Refer to the member by their displayName (e.g., "Matt's lineup", "Dan's roster"), or by descriptor ("this roster", "this ticket", "the GER/AUT/CAN/CPV portfolio").
- NEVER directly address the reader.
- NEVER use "stay tuned", "anything is possible", "watch this space", "rollercoaster", "Cinderella story", "wild ride".
- Exactly 4 sentences per blurb. Count them before responding.

Critical: respond with VALID JSON only — no preamble, no markdown fence — matching the schema {"blurbs": [{"memberId": "<id>", "blurb": "<text>"}, ...]}. Include every memberId you were given, no extras.`

function buildUserPrompt(inputs: BlurbInput[]): string {
  const lines: string[] = []
  lines.push(
    `Write a 2–3 sentence power-ranking blurb for each of these ${inputs.length} members. Return JSON {"blurbs":[...]}. Include every memberId.`
  )
  lines.push("")
  for (const m of inputs) {
    const deltaStr =
      m.delta === 0
        ? "no change from yesterday"
        : m.delta > 0
          ? `up ${m.delta} from yesterday`
          : `down ${Math.abs(m.delta)} from yesterday`
    lines.push(`### ${m.displayName} (id: ${m.memberId})`)
    lines.push(`Teams: ${m.teams.join(", ")}`)
    lines.push(`Rank: ${m.rank}/12 (${deltaStr})`)
    lines.push(
      `Expected points: ${m.expectedPoints.toFixed(1)} (banked ${m.bankedPoints}, projected from remaining matches ${m.remainingXPts.toFixed(1)})`
    )
    lines.push(`Results since last refresh: ${m.resultsSinceLast || "none"}`)
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
}): BlurbInput[] {
  const inputs: BlurbInput[] = []
  for (const member of MEMBERS) {
    const x = args.memberXPts.find((m) => m.memberId === member.id)
    if (!x) continue
    const rank = args.rankings.get(member.id) ?? 12
    const prevRank = args.previousRankings?.get(member.id) ?? null
    const delta = prevRank == null ? 0 : prevRank - rank
    const results = args.resultsByMember.get(member.id)
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
    })
  }
  return inputs
}
