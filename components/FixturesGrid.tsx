"use client"

import { useMemo } from "react"
import type { Match, TeamCode } from "@/lib/scoring/types"
import type { Member } from "@/lib/config/members"
import {
  buildCellData,
  findNextFixture,
  formatShortDate,
  indexFixturesByTeamAndDate,
  makeDateRange,
} from "@/lib/standings/fixtures"
import { formatLocal, todayLocalDateKey, useUserTimeZone } from "@/lib/time/local"
import { getTeam } from "@/lib/config/teams"
import { Flag } from "./Flag"
import { FixtureCell } from "./FixtureCell"

interface FixturesGridProps {
  members: readonly Member[]
  matches: Match[]
  /** Tournament range. */
  rangeStart?: string
  rangeEnd?: string
}

// Tournament range padded by a day on the end so matches near the edge
// can't fall off the grid when a viewer's local date differs from UTC. The
// start needs no padding because no matches play in any US time zone on 6/10.
const DEFAULT_START = "2026-06-11"
const DEFAULT_END = "2026-07-20"

const MEMBER_COL_PX = 156
const FLAG_COL_PX = 48
const DATE_COL_PX = 80
const TEAM_ROW_PX = 60

export function FixturesGrid({
  members,
  matches,
  rangeStart = DEFAULT_START,
  rangeEnd = DEFAULT_END,
}: FixturesGridProps) {
  const timeZone = useUserTimeZone()

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [members]
  )
  const dates = useMemo(
    () => makeDateRange(new Date(rangeStart), new Date(rangeEnd)),
    [rangeStart, rangeEnd]
  )
  const fixtureIndex = useMemo(
    () => indexFixturesByTeamAndDate(matches, timeZone),
    [matches, timeZone]
  )
  const todayIso = todayLocalDateKey(timeZone)
  const totalWidth = MEMBER_COL_PX + FLAG_COL_PX + dates.length * DATE_COL_PX
  const todayIndex = dates.indexOf(todayIso)
  const todayLeft =
    todayIndex >= 0
      ? MEMBER_COL_PX + FLAG_COL_PX + todayIndex * DATE_COL_PX
      : null

  return (
    <div className="rounded-2xl ring-1 ring-white/10 bg-bg-raised/40 overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: totalWidth }}>
          <HeaderRow dates={dates} todayIso={todayIso} todayLeft={todayLeft} />
          <div className="flex flex-col gap-3 py-3">
            {sortedMembers.map((m) => (
              <MemberBlock
                key={m.id}
                member={m}
                dates={dates}
                matches={matches}
                fixtureIndex={fixtureIndex}
                todayLeft={todayLeft}
                timeZone={timeZone}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TodayHighlight({ todayLeft }: { todayLeft: number | null }) {
  if (todayLeft === null) return null
  return (
    <div
      aria-hidden
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: todayLeft,
        width: DATE_COL_PX,
        zIndex: 1,
        background:
          "linear-gradient(to bottom, rgba(0,245,212,0.16), rgba(0,245,212,0.06) 50%, rgba(0,245,212,0.16))",
        borderLeft: "1px solid rgba(0,245,212,0.65)",
        borderRight: "1px solid rgba(0,245,212,0.65)",
        boxShadow: "inset 0 0 24px rgba(0,245,212,0.15)",
      }}
    />
  )
}

function HeaderRow({
  dates,
  todayIso,
  todayLeft,
}: {
  dates: string[]
  todayIso: string
  todayLeft: number | null
}) {
  return (
    <div className="flex sticky top-0 z-20 bg-bg-raised border-b border-white/10">
      <TodayHighlight todayLeft={todayLeft} />
      <div
        className="sticky left-0 z-30 bg-bg-raised border-r border-white/10"
        style={{ width: MEMBER_COL_PX, minWidth: MEMBER_COL_PX }}
      />
      <div
        className="sticky z-30 bg-bg-raised border-r border-white/10"
        style={{
          left: MEMBER_COL_PX,
          width: FLAG_COL_PX,
          minWidth: FLAG_COL_PX,
        }}
      />
      {dates.map((d) => {
        const isToday = d === todayIso
        return (
          <div
            key={d}
            style={{ width: DATE_COL_PX, minWidth: DATE_COL_PX }}
            className={`px-1 py-2 text-center font-display text-[10px] tracking-[0.2em] border-r border-white/5 ${
              isToday ? "neon-text-cyan" : "text-white/55"
            }`}
          >
            {isToday ? "TODAY" : formatShortDate(d)}
          </div>
        )
      })}
    </div>
  )
}

function MemberBlock({
  member,
  dates,
  matches,
  fixtureIndex,
  todayLeft,
  timeZone,
}: {
  member: Member
  dates: string[]
  matches: Match[]
  fixtureIndex: Map<TeamCode, Map<string, Match>>
  todayLeft: number | null
  timeZone?: string
}) {
  const next = findNextFixture(matches, member.teams)

  return (
    <div className="flex relative ring-1 ring-white/10 bg-bg-row/55 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <TodayHighlight todayLeft={todayLeft} />
      {/* Sticky member info column */}
      <div
        className="sticky left-0 z-30 border-r border-white/10 p-3 flex flex-col justify-center"
        style={{
          width: MEMBER_COL_PX,
          minWidth: MEMBER_COL_PX,
          backgroundColor: "#141425",
          boxShadow: "4px 0 12px -6px rgba(0,0,0,0.6)",
        }}
      >
        <div className="font-display text-base tracking-wide leading-tight whitespace-pre-line">
          {member.displayName.replace(" / ", " /\n")}
        </div>
        <NextFixtureLine
          match={next}
          ownTeams={member.teams}
          timeZone={timeZone}
        />
      </div>

      {/* Right side: 4 team rows */}
      <div className="flex-1">
        {member.teams.map((team, i) => (
          <TeamRow
            key={team}
            team={team}
            dates={dates}
            fixtureIndex={fixtureIndex}
            isFirstTeam={i === 0}
            timeZone={timeZone}
          />
        ))}
      </div>
    </div>
  )
}

function NextFixtureLine({
  match,
  ownTeams,
  timeZone,
}: {
  match: Match | null
  ownTeams: readonly TeamCode[]
  timeZone?: string
}) {
  if (!match) {
    return (
      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40 font-display">
        No upcoming
      </div>
    )
  }
  const ownSide = ownTeams.includes(match.home as TeamCode)
    ? "home"
    : "away"
  const ownTeam = ownSide === "home" ? match.home : match.away
  const opp = ownSide === "home" ? match.away : match.home
  const when = formatLocal(
    match.utcKickoff,
    {
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
    timeZone
  )
  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-[0.25em] text-white/50 font-display">
        Next
      </div>
      <div className="flex items-center gap-1.5 text-sm text-white/85">
        <Flag team={ownTeam} size={20} />
        <span className="font-display text-xs tracking-[0.1em] text-white/55">vs</span>
        <Flag team={opp} size={20} />
        <span className="font-display text-xs tracking-[0.1em]">{opp}</span>
      </div>
      <div className="text-xs text-white/65">{when}</div>
    </div>
  )
}

function TeamRow({
  team,
  dates,
  fixtureIndex,
  isFirstTeam,
  timeZone,
}: {
  team: TeamCode
  dates: string[]
  fixtureIndex: Map<TeamCode, Map<string, Match>>
  isFirstTeam: boolean
  timeZone?: string
}) {
  const t = getTeam(team)
  const dateMap = fixtureIndex.get(team)
  return (
    <div
      className={`flex ${isFirstTeam ? "" : "border-t border-white/5"}`}
      style={{ height: TEAM_ROW_PX }}
    >
      <div
        className="sticky z-30 border-r border-white/10 flex flex-col items-center justify-center"
        style={{
          left: MEMBER_COL_PX,
          width: FLAG_COL_PX,
          minWidth: FLAG_COL_PX,
          backgroundColor: "#141425",
          boxShadow: "4px 0 12px -6px rgba(0,0,0,0.6)",
        }}
        title={t?.name ?? team}
      >
        <Flag team={team} size={22} />
        <span className="mt-1 font-display text-[10px] tracking-[0.15em] text-white/55">
          {team}
        </span>
      </div>
      {dates.map((d) => {
        const match = dateMap?.get(d)
        const data = match ? buildCellData(match, team) : null
        return (
          <div
            key={d}
            style={{ width: DATE_COL_PX, minWidth: DATE_COL_PX }}
            className="border-r border-white/5"
          >
            <FixtureCell data={data} timeZone={timeZone} />
          </div>
        )
      })}
    </div>
  )
}
