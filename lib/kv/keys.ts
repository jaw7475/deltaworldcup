export const KV_KEYS = {
  matchesAll: "matches:all",
  standingsCurrent: "standings:current",
  standingsHistory: "standings:history",
  syncLastRunAt: "sync:lastRunAt",
  syncLastSuccessAt: "sync:lastSuccessAt",
  syncLastError: "sync:lastError",
  powerRankingsCurrent: "powerRankings:current",
  powerRankingsPrevious: "powerRankings:previous",
  topScorers: "scorers:list",
} as const

export const HISTORY_CAP = 100
