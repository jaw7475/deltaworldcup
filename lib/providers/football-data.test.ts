import { afterEach, describe, it, expect, vi } from "vitest"
import { FootballDataApiProvider } from "./football-data"

function mockFetchOnce(payload: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("FootballDataApiProvider.fetchAllMatches", () => {
  // football-data.org rolls shootout goals into score.fullTime. Our `fullTime`
  // must be end-of-ET-if-played-else-90 (no shootout) because it feeds the GF
  // tiebreaker.
  it("strips shootout goals from fullTime + currentScore when match went to penalties", async () => {
    mockFetchOnce({
      matches: [
        {
          id: 99001,
          utcDate: "2026-07-04T18:00:00Z",
          status: "FINISHED",
          stage: "ROUND_OF_16",
          homeTeam: { tla: "ARG" },
          awayTeam: { tla: "FRA" },
          score: {
            winner: "HOME_TEAM",
            duration: "PENALTY_SHOOTOUT",
            fullTime: { home: 5, away: 4 }, // 1-1 after ET, 4-3 on pens
            extraTime: { home: 1, away: 1 },
            penalties: { home: 4, away: 3 },
          },
        },
      ],
    })

    const provider = new FootballDataApiProvider("test-token")
    const [match] = await provider.fetchAllMatches()

    expect(match.wentToPenalties).toBe(true)
    expect(match.penalties).toEqual({ home: 4, away: 3 })
    expect(match.fullTime).toEqual({ home: 1, away: 1 })
    expect(match.currentScore).toEqual({ home: 1, away: 1 })
    expect(match.winner).toBe("ARG")
  })

  it("leaves fullTime untouched for FT matches without a shootout", async () => {
    mockFetchOnce({
      matches: [
        {
          id: 99002,
          utcDate: "2026-06-12T18:00:00Z",
          status: "FINISHED",
          stage: "GROUP_STAGE",
          homeTeam: { tla: "USA" },
          awayTeam: { tla: "MEX" },
          score: {
            winner: "HOME_TEAM",
            duration: "REGULAR",
            fullTime: { home: 2, away: 1 },
          },
        },
      ],
    })

    const provider = new FootballDataApiProvider("test-token")
    const [match] = await provider.fetchAllMatches()

    expect(match.wentToPenalties).toBe(false)
    expect(match.fullTime).toEqual({ home: 2, away: 1 })
    expect(match.currentScore).toEqual({ home: 2, away: 1 })
  })

  // football-data froze match 537382 (R16 SUI vs COL) as FINISHED mid-shootout
  // with a null winner, which stranded Colombia on "active" and mis-scored
  // Switzerland. The MATCH_OVERRIDES entry forces the known outcome; remove that
  // override (and this test) once upstream repairs the record.
  it("applies the manual override for the broken SUI vs COL R16 record", async () => {
    mockFetchOnce({
      matches: [
        {
          id: 537382,
          utcDate: "2026-07-07T20:00:00Z",
          status: "FINISHED",
          stage: "LAST_16",
          homeTeam: { tla: "SUI" },
          awayTeam: { tla: "COL" },
          score: {
            winner: null, // upstream never resolved the shootout winner
            duration: "PENALTY_SHOOTOUT",
            fullTime: { home: 4, away: 3 },
            penalties: { home: 3, away: 3 },
          },
        },
      ],
    })

    const provider = new FootballDataApiProvider("test-token")
    const [match] = await provider.fetchAllMatches()

    expect(match.winner).toBe("SUI")
    expect(match.status).toBe("FINISHED")
    expect(match.wentToPenalties).toBe(true)
    expect(match.fullTime).toEqual({ home: 0, away: 0 })
  })

  it("leaves fullTime untouched for ET-decided matches (no shootout)", async () => {
    mockFetchOnce({
      matches: [
        {
          id: 99003,
          utcDate: "2026-07-05T18:00:00Z",
          status: "FINISHED",
          stage: "QUARTER_FINALS",
          homeTeam: { tla: "BRA" },
          awayTeam: { tla: "GER" },
          score: {
            winner: "HOME_TEAM",
            duration: "EXTRA_TIME",
            fullTime: { home: 2, away: 1 }, // 1-1 reg, 1-0 ET
            extraTime: { home: 1, away: 0 },
          },
        },
      ],
    })

    const provider = new FootballDataApiProvider("test-token")
    const [match] = await provider.fetchAllMatches()

    expect(match.wentToExtraTime).toBe(true)
    expect(match.wentToPenalties).toBe(false)
    expect(match.fullTime).toEqual({ home: 2, away: 1 })
  })
})
