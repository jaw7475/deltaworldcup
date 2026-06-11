import { describe, it, expect } from "vitest"
import { isPacificActiveHours, isInWindow, MATCH_WINDOW_MIN } from "./windows"
import type { ScheduledMatch } from "@/lib/config/schedule"

function at(iso: string): Date {
  return new Date(iso)
}

describe("isPacificActiveHours (09:00–01:00 America/Los_Angeles)", () => {
  it("09:00 LA in summer (PDT, UTC-7) → active", () => {
    // 2026-07-15 09:00 PDT = 16:00 UTC
    expect(isPacificActiveHours(at("2026-07-15T16:00:00Z"))).toBe(true)
  })

  it("08:59 LA in summer (PDT, UTC-7) → not active", () => {
    // 2026-07-15 08:59 PDT = 15:59 UTC
    expect(isPacificActiveHours(at("2026-07-15T15:59:00Z"))).toBe(false)
  })

  it("00:30 LA in summer (PDT) → still active (before 01:00 cutoff)", () => {
    // 2026-07-16 00:30 PDT = 07:30 UTC
    expect(isPacificActiveHours(at("2026-07-16T07:30:00Z"))).toBe(true)
  })

  it("01:00 LA in summer (PDT) → inactive at the cutoff (exclusive)", () => {
    // 2026-07-16 01:00 PDT = 08:00 UTC
    expect(isPacificActiveHours(at("2026-07-16T08:00:00Z"))).toBe(false)
  })

  it("04:00 LA in summer (PDT) → inactive (deep overnight)", () => {
    // 2026-07-16 04:00 PDT = 11:00 UTC
    expect(isPacificActiveHours(at("2026-07-16T11:00:00Z"))).toBe(false)
  })

  it("DST-aware: 09:00 LA in winter (PST, UTC-8) → active", () => {
    // 2026-01-15 09:00 PST = 17:00 UTC
    expect(isPacificActiveHours(at("2026-01-15T17:00:00Z"))).toBe(true)
  })

  it("DST-aware: 09:00 LA in winter (PST) at 16:00 UTC → inactive (would be 08:00 PST)", () => {
    expect(isPacificActiveHours(at("2026-01-15T16:00:00Z"))).toBe(false)
  })
})

describe("isInWindow (170-min match window)", () => {
  const sched: ScheduledMatch[] = [
    {
      id: "m1",
      stage: "GROUP",
      utcKickoff: "2026-06-12T20:00:00Z",
      home: "USA",
      away: "MEX",
    },
    {
      id: "m2",
      stage: "GROUP",
      utcKickoff: "2026-06-13T17:00:00Z",
      home: "ARG",
      away: "BRA",
    },
  ]

  it("exposes the 170-minute constant", () => {
    expect(MATCH_WINDOW_MIN).toBe(170)
  })

  it("returns false 10 min before kickoff", () => {
    expect(isInWindow(at("2026-06-12T19:50:00Z"), sched)).toBe(false)
  })

  it("returns true at kickoff", () => {
    expect(isInWindow(at("2026-06-12T20:00:00Z"), sched)).toBe(true)
  })

  it("returns true within the 5-min pre-roll", () => {
    expect(isInWindow(at("2026-06-12T19:56:00Z"), sched)).toBe(true)
  })

  it("returns true at kickoff + 169 min (still in window)", () => {
    expect(isInWindow(at("2026-06-12T22:49:00Z"), sched)).toBe(true)
  })

  it("returns false at kickoff + 170 min (exclusive end)", () => {
    expect(isInWindow(at("2026-06-12T22:50:00Z"), sched)).toBe(false)
  })

  it("returns true when inside any of several scheduled matches", () => {
    expect(isInWindow(at("2026-06-13T17:30:00Z"), sched)).toBe(true)
  })

  it("returns false on an empty schedule", () => {
    expect(isInWindow(at("2026-06-12T20:00:00Z"), [])).toBe(false)
  })

  it("handles overlapping windows (back-to-back matches)", () => {
    const overlapping: ScheduledMatch[] = [
      {
        id: "a",
        stage: "GROUP",
        utcKickoff: "2026-06-12T15:00:00Z",
        home: "USA",
        away: "ENG",
      },
      {
        id: "b",
        stage: "GROUP",
        utcKickoff: "2026-06-12T17:30:00Z",
        home: "BRA",
        away: "ARG",
      },
    ]
    // 17:00 UTC is inside match a's window AND match b's pre-roll
    expect(isInWindow(at("2026-06-12T17:00:00Z"), overlapping)).toBe(true)
  })
})
