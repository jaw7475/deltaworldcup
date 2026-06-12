"use client"

import { useEffect, useMemo, useState } from "react"
import { MEMBERS, getMember } from "@/lib/config/members"
import { DRAFT_ROUNDS, DRAFT_SLOTS } from "@/lib/config/sleeper"
import type { DraftCell } from "@/lib/draft/picks"

interface DraftBoardData {
  slotOrder: string[]
  cells: DraftCell[]
  hasLiveMatch: boolean
  computedAt: string | null
  sleeperStatus: "ok" | "stale" | "unavailable"
  sleeperFetchedAt: string | null
  sleeperError: string | null
  tradedPicksCount: number
}

interface DraftBoardProps {
  initialData: DraftBoardData | null
}

export function DraftBoard({ initialData }: DraftBoardProps) {
  const [data, setData] = useState<DraftBoardData | null>(initialData)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialData?.slotOrder[0] ?? null
  )
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch("/api/draft-board", { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as DraftBoardData
        if (cancelled) return
        setData(json)
        setSelectedId((prev) => prev ?? json.slotOrder[0] ?? null)
      } catch {
        // ignore — keep showing whatever we have
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (!initialData) fetchData()
    return () => {
      cancelled = true
    }
  }, [initialData])

  const cellsByRoundSlot = useMemo(() => {
    const map = new Map<string, DraftCell>()
    if (!data) return map
    for (const c of data.cells) map.set(`${c.round}:${c.slot}`, c)
    return map
  }, [data])

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-bg-raised/50 p-8 text-center text-white/60 font-display tracking-wider uppercase text-sm">
        {loading ? "Loading draft board…" : "Draft board unavailable."}
      </div>
    )
  }

  const slotMembers = data.slotOrder.map((id) => getMember(id))
  const selectedMember = selectedId ? getMember(selectedId) : undefined

  const ownedSet = new Set(
    data.cells
      .filter((c) => c.currentOwnerMemberId === selectedId)
      .map((c) => `${c.round}:${c.slot}`)
  )
  const tradedAwaySet = new Set(
    data.cells
      .filter(
        (c) =>
          c.slotOwnerMemberId === selectedId &&
          c.currentOwnerMemberId !== selectedId
      )
      .map((c) => `${c.round}:${c.slot}`)
  )

  const tradedAwayCount = tradedAwaySet.size

  return (
    <section className="flex flex-col gap-5">
      {/* Status / banner row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-display uppercase tracking-[0.25em] text-white/55">
        <div className="flex items-center gap-3">
          <span>2026 Draft · 16 rounds · snake</span>
          {data.hasLiveMatch && (
            <span className="inline-flex items-center gap-1.5 text-neon-live">
              <span className="inline-block size-1.5 rounded-full bg-neon-live animate-live-pulse shadow-neon-live" />
              Slots may shift — live match in progress
            </span>
          )}
        </div>
        <SleeperStatusBadge
          status={data.sleeperStatus}
          tradedCount={data.tradedPicksCount}
        />
      </div>

      {/* Member selector chips */}
      <div
        role="tablist"
        aria-label="Select a member to view their picks"
        className="flex flex-nowrap overflow-x-auto sm:flex-wrap gap-1.5 bg-bg-raised/40 border-y border-white/15 px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MEMBERS.map((m) => {
          const isActive = m.id === selectedId
          const accent = m.accentColor ?? "#00f5d4"
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedId(m.id)}
              style={
                isActive
                  ? {
                      color: accent,
                      boxShadow: `0 0 12px ${hexA(accent, 0.5)}, 0 0 32px ${hexA(accent, 0.2)}`,
                      borderColor: hexA(accent, 0.5),
                      backgroundColor: hexA(accent, 0.12),
                    }
                  : undefined
              }
              className={[
                "shrink-0 font-display tracking-[0.18em] uppercase text-[10px] sm:text-[11px]",
                "px-2.5 sm:px-3 py-1.5 rounded-lg border transition",
                isActive
                  ? "border-white/0"
                  : "border-white/0 text-white/55 hover:text-white hover:bg-white/5",
              ].join(" ")}
            >
              <span
                aria-hidden
                className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
                style={{ backgroundColor: accent }}
              />
              {m.displayName}
            </button>
          )
        })}
      </div>

      {/* Selected member summary */}
      {selectedMember && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="font-display text-sm tracking-widest uppercase text-white">
            <span style={{ color: selectedMember.accentColor }}>
              {selectedMember.displayName}
            </span>
            {tradedAwayCount > 0 && (
              <>
                <span className="text-white/40"> · </span>
                <span className="text-white/50">
                  traded away {tradedAwayCount}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Board grid — horizontally scrollable on small screens */}
      <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10 bg-bg-raised/40">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-center">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-bg-raised/95 backdrop-blur px-2 py-2 text-[10px] font-display uppercase tracking-widest text-white/40 border-b border-white/10"
              >
                Rd
              </th>
              {slotMembers.map((m, i) => {
                const accent = m?.accentColor ?? "#ffffff"
                return (
                  <th
                    key={i}
                    scope="col"
                    className="px-1 py-2 border-b border-white/10"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-display uppercase tracking-widest text-white/40">
                        Slot {i + 1}
                      </span>
                      <span
                        className="text-[10px] sm:text-[11px] font-display uppercase tracking-wider truncate max-w-[80px]"
                        style={{ color: accent }}
                        title={m?.displayName ?? "—"}
                      >
                        {m?.displayName ?? "—"}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DRAFT_ROUNDS }).map((_, rIdx) => {
              const round = rIdx + 1
              return (
                <tr key={round}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-bg-raised/95 backdrop-blur px-2 py-1 text-[10px] font-display uppercase tracking-widest text-white/40 border-b border-white/5"
                  >
                    {round}
                  </th>
                  {Array.from({ length: DRAFT_SLOTS }).map((_, sIdx) => {
                    const slot = sIdx + 1
                    const cell = cellsByRoundSlot.get(`${round}:${slot}`)
                    if (!cell) return <td key={slot} />
                    const key = `${round}:${slot}`
                    const isOwned = ownedSet.has(key)
                    const isTradedAway = tradedAwaySet.has(key)
                    const slotMember = getMember(cell.slotOwnerMemberId)
                    const ownerMember = getMember(cell.currentOwnerMemberId)
                    const accent =
                      ownerMember?.accentColor ??
                      slotMember?.accentColor ??
                      "#ffffff"

                    return (
                      <td
                        key={slot}
                        className="p-0.5 border-b border-white/5 align-middle"
                      >
                        <div
                          className={[
                            "h-12 sm:h-14 flex flex-col items-center justify-center rounded-md transition relative",
                            isOwned
                              ? "ring-2"
                              : isTradedAway
                                ? "opacity-40"
                                : "ring-1 ring-white/5",
                          ].join(" ")}
                          style={
                            isOwned
                              ? {
                                  backgroundColor: hexA(accent, 0.18),
                                  boxShadow: `0 0 10px ${hexA(accent, 0.55)}, 0 0 24px ${hexA(accent, 0.22)}`,
                                  borderColor: hexA(accent, 0.6),
                                }
                              : undefined
                          }
                          title={cellTitle(cell, slotMember, ownerMember)}
                        >
                          <span
                            className={[
                              "font-display tracking-wider text-[11px] sm:text-[12px]",
                              isOwned
                                ? "text-white"
                                : isTradedAway
                                  ? "text-white/60 line-through"
                                  : "text-white/80",
                            ].join(" ")}
                          >
                            {cell.pickLabel}
                          </span>
                          {isTradedAway && ownerMember && (
                            <span
                              className="text-[8px] font-display uppercase tracking-widest mt-0.5"
                              style={{ color: ownerMember.accentColor }}
                            >
                              → {shortName(ownerMember.displayName)}
                            </span>
                          )}
                          {!isOwned && !isTradedAway && cell.traded && (
                            // someone else's column whose pick was traded to a third party — subtle marker
                            <span
                              className="absolute top-0.5 right-1 text-[8px] text-white/30"
                              aria-hidden
                            >
                              ⇄
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Legend />
    </section>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10px] font-display uppercase tracking-[0.25em] text-white/45">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2 rounded ring-2 ring-neon-cyan/60 bg-neon-cyan/20" />
        Owns this pick
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2 rounded bg-white/15 opacity-50" />
        Traded away
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-white/30">⇄</span>
        Pick traded between others
      </span>
    </div>
  )
}

function SleeperStatusBadge({
  status,
  tradedCount,
}: {
  status: DraftBoardData["sleeperStatus"]
  tradedCount: number
}) {
  if (status === "ok") {
    return (
      <span className="text-white/45">
        {tradedCount} traded {tradedCount === 1 ? "pick" : "picks"} from Sleeper
      </span>
    )
  }
  if (status === "stale") {
    return (
      <span className="text-neon-yellow/80">
        Sleeper data stale — showing last cached trades
      </span>
    )
  }
  return (
    <span className="text-neon-magenta/80">
      Sleeper unavailable — showing standings only
    </span>
  )
}

function cellTitle(
  cell: DraftCell,
  slotMember: ReturnType<typeof getMember>,
  ownerMember: ReturnType<typeof getMember>
): string {
  const slotName = slotMember?.displayName ?? "—"
  const ownerName = ownerMember?.displayName ?? "—"
  if (cell.traded) {
    return `${cell.pickLabel} — originally ${slotName}, now owned by ${ownerName}`
  }
  return `${cell.pickLabel} — ${slotName}`
}

function shortName(displayName: string): string {
  // "Josh G / Andrew B" → "JG/AB", "Zach M" → "ZM", "Spencer" → "Spencer"
  if (displayName.includes("/")) {
    return displayName
      .split("/")
      .map((part) =>
        part
          .trim()
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
      )
      .join("/")
  }
  return displayName
}

/** Append an alpha to a #RRGGBB color and return `rgba(...)`. */
function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
