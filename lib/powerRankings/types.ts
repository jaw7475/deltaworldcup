export interface PowerRanking {
  memberId: string
  /** 1 = top of the rankings. */
  rank: number
  /** Total expected points across all 4 teams for the whole tournament. */
  expectedPoints: number
  /** Change in rank since the previous daily ranking (+1 = climbed one spot). */
  delta: number
  /** 1–3 sentence blurb. */
  blurb: string
  /**
   * Short summary of what happened to this member's teams since the previous
   * daily ranking. Empty string if nothing notable.
   */
  resultsSinceLast: string
}

export interface PowerRankingsSnapshot {
  /** ISO timestamp the rankings were generated. */
  computedAt: string
  rankings: PowerRanking[]
}
