/**
 * MOCKED Power Rankings data.
 *
 * The real version will be regenerated once a day by a background job that
 * blends each member's remaining expected points (group-stage probabilities,
 * KO survival odds, GF tiebreaker) with a small subjective bump for picks the
 * model thinks are mispriced. For now the values below are hand-tuned to make
 * the UI look right.
 */

export interface PowerRanking {
  memberId: string
  /** 1 = top of the rankings. */
  rank: number
  /** Total expected points across all 4 teams for the whole tournament. */
  expectedPoints: number
  /** Change in rank since the previous daily ranking (+1 = climbed one spot). */
  delta: number
  /**
   * 1–3 sentence blurb. Should have personality — these are read by the league
   * group chat, not used as input to anything downstream.
   */
  blurb: string
  /**
   * Short summary of what happened to this member's teams since the previous
   * daily ranking. Empty string if nothing notable.
   */
  resultsSinceLast: string
}

/** ISO timestamp the rankings were last regenerated. Updated by the daily job. */
export const POWER_RANKINGS_UPDATED_AT = "2026-06-11T14:00:00.000Z"

export const POWER_RANKINGS: readonly PowerRanking[] = [
  {
    memberId: "zach-d",
    rank: 1,
    expectedPoints: 24.6,
    delta: 0,
    blurb:
      "Mbappé and Haaland on the same roster is borderline cheating, and France's 3-1 stroll past Croatia already proved the point — two of the three highest-xG attackers in world football pulling for the same draft pick. Switzerland is the most reliable second-round ticket in Europe; you can practically pencil them in for 4 group points. Norway grabbed a Scotland draw without ever looking like they cared, and Curaçao exists mostly as a rounding error. The only path to losing this lineup is France imploding in a quarterfinal shootout — and even then the GF tiebreaker is already stacked.",
    resultsSinceLast: "FRA 3-1 CRO (W, +3, +3 GF) · NOR drew SCO 1-1 (D, +1)",
  },
  {
    memberId: "danny",
    rank: 2,
    expectedPoints: 22.9,
    delta: 1,
    blurb:
      "Messi's farewell tour opened with a 2-0 demolition of Saudi Arabia — he was on the scoresheet inside 20 minutes — and Mexico ground out a 1-1 with Croatia at the Azteca, the host bump showing up immediately. Panama and New Zealand are dead weight, full stop, but Argentina alone can carry this ticket to the semis and bank a pile of GF along the way. The real question is whether Mexico gets out of the group; if they do, this roster jumps to #1 in a week. The +1 from yesterday is the model already starting to believe.",
    resultsSinceLast: "ARG 2-0 KSA (W, +3, +2 GF) · MEX drew CRO 1-1 (D, +1)",
  },
  {
    memberId: "dan",
    rank: 3,
    expectedPoints: 21.4,
    delta: -1,
    blurb:
      "Portugal needed a late winner to beat Bosnia 2-1, which is exactly the grinding-out style this lineup is built on, and Korea grabbed a respectable 1-1 with Belgium to bank another quiet point. Ronaldo's last waltz, Son still cooking, and two African sides that always punch up — Ghana and Tunisia are the kind of teams that bank a draw against a top seed and ruin your bracket. No glaring liability anywhere, but no headline-grabbing ceiling either; this is the diversified index fund of rosters. The drop to third is more about Argentina rising than anything Portugal did wrong.",
    resultsSinceLast: "POR 2-1 BIH (W, +3, +1 GF) · KOR drew BEL 1-1 (D, +1)",
  },
  {
    memberId: "zach-m",
    rank: 4,
    expectedPoints: 20.7,
    delta: 0,
    blurb:
      "Brazil announced themselves with a 4-1 thrashing of Japan — Vinicius unplayable — and the USA edged Iran 1-0 in front of a packed, deafening home crowd. The Pulisic-led American side is the real sleeper here, and the model probably under-prices three home games. Algeria and South Africa are coin flips, but Algeria specifically has the firepower to steal one. The floor here is rock solid; the ceiling needs USA to make a real run.",
    resultsSinceLast: "BRA 4-1 JPN (W, +3, +3 GF) · USA 1-0 IRN (W, +3, +1 GF)",
  },
  {
    memberId: "jake",
    rank: 5,
    expectedPoints: 19.5,
    delta: 2,
    blurb:
      "Germany rolled past Ecuador 2-1 in a tidy opener and Canada beat Scotland 1-0 at home — three of the four anchor teams have already banked full points and Cape Verde hasn't dragged anyone down yet. Germany's quietly rebuilt under the new staff and Austria over-performs every single cycle. The host bump for Canada is real and showing up on the scoresheet on day one. If GER and AUT both clear their groups this jumps into podium contention by the round of 16, and the +2 today reflects how good that opening week looked.",
    resultsSinceLast: "GER 2-1 ECU (W, +3, +1 GF) · CAN 1-0 SCO (W, +3, +1 GF)",
  },
  {
    memberId: "josh-g-andrew-b",
    rank: 6,
    expectedPoints: 18.6,
    delta: -1,
    blurb:
      "Spain handled Switzerland 2-0 in a clinical opener — they're playing the best football of any European side right now and the model has them at 7+ xPts alone. Saudi Arabia, as expected, folded against Argentina for a clean zero. Senegal can absolutely cook a group-stage upset; remember 2022. Paraguay and KSA are scoreless tags hanging off the back of the roster, which is fine — you don't need all four to fire.",
    resultsSinceLast: "ESP 2-0 SUI (W, +3, +2 GF) · KSA 0-2 ARG (L, 0)",
  },
  {
    memberId: "matt",
    rank: 7,
    expectedPoints: 17.3,
    delta: 0,
    blurb:
      "England did England things in a 2-0 over Senegal — clinical, slightly boring, exactly the floor you drafted them for. Japan grabbed a stunning 1-1 with Brazil and Mitoma already looks like a problem for the rest of the bracket. Egypt with a healthy Salah is one good draw away from a round-of-16 cameo, and Uzbekistan is, charitably, a vibe. The variance here is enormous, but the Japan result already pushed the model's ceiling estimate up a tick.",
    resultsSinceLast: "ENG 2-0 SEN (W, +3, +2 GF) · JPN drew BRA 1-1 (D, +1)",
  },
  {
    memberId: "spencer",
    rank: 8,
    expectedPoints: 15.9,
    delta: 1,
    blurb:
      "Netherlands cleared Australia 3-1 in a stress-free opener — they'll go at least to a quarterfinal, that's basically the baseline of this lineup. Turkey did exactly what Turkey does, going up 2-0 on Jordan and conceding two late ones for a 2-2 draw that felt like a loss. DR Congo and Qatar are anvils tied to your ankle in deep water; expect zero meaningful points from either. The whole roster is one Turkey course-correction away from a real jump up the board.",
    resultsSinceLast: "NED 3-1 AUS (W, +3, +2 GF) · TUR drew JOR 2-2 (D, +1, +2 GF)",
  },
  {
    memberId: "andrew-s",
    rank: 9,
    expectedPoints: 14.4,
    delta: -1,
    blurb:
      "Belgium's golden generation is mostly rust at this point — a 1-1 with Korea that felt like an L, Lukaku and De Bruyne both running on fumes. Australia got picked apart 2-0 by the Dutch in exactly the way you'd expect. Ivory Coast quietly has real talent and could be the surprise that drags this whole ticket up the board — and they haven't even kicked off yet. The thesis is BEL stops the bleeding while CIV catches a hot run; matchday 2 will tell us if either is actually happening.",
    resultsSinceLast: "BEL drew KOR 1-1 (D, +1) · AUS 0-2 NED (L, 0)",
  },
  {
    memberId: "zach-f",
    rank: 10,
    expectedPoints: 13.4,
    delta: 1,
    blurb:
      "Morocco opened with a comfortable 2-0 over South Africa and Scotland snuck a draw out of Canada — the lineup is actually scoring at the top of its expected range so far, which is how you get a +1 from a 10th seed. Morocco still has 2022 magic in the tank and a real semifinal-or-bust case if the bracket breaks right. Ecuador and Scotland are mid in slightly different flavors, but Scotland's draw was a quietly valuable result. This is a one-team roster, but the one team is genuinely scary.",
    resultsSinceLast: "MAR 2-0 RSA (W, +3, +2 GF) · SCO drew CAN 1-1 (D, +1)",
  },
  {
    memberId: "josh-w",
    rank: 11,
    expectedPoints: 11.7,
    delta: -1,
    blurb:
      "Croatia salvaged a 1-1 with Mexico — Modrić quietly excellent, one viral moment delivered as promised — and Uruguay grinded out a 1-0 over Tunisia. Both results were the *exact* median outcome the model projected, which is sort of the problem with this whole lineup. Czechia and Bosnia round out the most generic roster on the board — competent, uninspired, unlikely to surprise anyone. The whole thing reads as a 4-decent-teams strategy that left no upside on the table.",
    resultsSinceLast: "CRO drew MEX 1-1 (D, +1) · URU 1-0 TUN (W, +3, +1 GF)",
  },
  {
    memberId: "jesse",
    rank: 12,
    expectedPoints: 10.5,
    delta: 0,
    blurb:
      "Colombia drew Tunisia 0-0 in a snoozer that confirmed the floor, and Iran lost 1-2 to Korea — one point gained, no surprises, no movement. There's no marquee team here, no obvious upside pick, no real path to a top-half finish without a miracle. Colombia is the only realistic source of knockout points and even they'd need to bracket-bust to matter. The good news: nowhere to go but up, and Colombia's match against Sweden later this week is basically the whole season.",
    resultsSinceLast: "COL drew TUN 0-0 (D, +1) · IRN 1-2 KOR (L, 0, +1 GF)",
  },
] as const

const POWER_RANKINGS_BY_ID = new Map<string, PowerRanking>(
  POWER_RANKINGS.map((r) => [r.memberId, r])
)

export function getPowerRanking(memberId: string): PowerRanking | undefined {
  return POWER_RANKINGS_BY_ID.get(memberId)
}
