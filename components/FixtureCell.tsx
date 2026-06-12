import type { FixtureCellData, FixtureOutcome } from "@/lib/standings/fixtures"
import { formatLocalKickoffTime } from "@/lib/standings/fixtures"
import { Flag } from "./Flag"

interface FixtureCellProps {
  data: FixtureCellData | null
}

interface PaletteEntry {
  glow: string
  border: string
  inner: string
  text: string
}

const PALETTE: Record<FixtureOutcome, PaletteEntry> = {
  scheduled: {
    glow: "rgba(0, 212, 255, 0.55)",
    border: "rgba(0, 212, 255, 0.75)",
    inner: "rgba(8, 14, 30, 0.62)",
    text: "#cdf2ff",
  },
  win: {
    glow: "rgba(75, 255, 102, 0.55)",
    border: "rgba(155, 255, 102, 0.85)",
    inner: "rgba(8, 18, 12, 0.6)",
    text: "#dcffd0",
  },
  draw: {
    glow: "rgba(254, 228, 64, 0.55)",
    border: "rgba(254, 228, 64, 0.85)",
    inner: "rgba(22, 18, 6, 0.6)",
    text: "#fff5b8",
  },
  loss: {
    glow: "rgba(255, 61, 101, 0.55)",
    border: "rgba(255, 61, 101, 0.85)",
    inner: "rgba(22, 8, 12, 0.6)",
    text: "#ffd0d8",
  },
  live: {
    glow: "rgba(255, 138, 61, 0.6)",
    border: "rgba(255, 138, 61, 0.9)",
    inner: "rgba(22, 12, 6, 0.6)",
    text: "#ffe1cc",
  },
}

export function FixtureCell({ data }: FixtureCellProps) {
  if (!data) {
    return <div className="h-full w-full" />
  }

  const palette = PALETTE[data.outcome]

  return (
    <div className="relative z-[5] p-1 h-full">
      <div
        className="relative h-full w-full rounded-md overflow-hidden flex"
        style={{
          background: `linear-gradient(135deg, ${palette.glow}, ${palette.border})`,
          boxShadow: `0 0 10px -1px ${palette.glow}, inset 0 0 0 1px ${palette.border}`,
        }}
      >
        <div
          className="absolute inset-[3px] rounded-[5px]"
          style={{ background: palette.inner }}
        />
        <div
          className="relative z-10 flex flex-col items-center justify-center gap-0.5 w-full px-1 py-1 text-center"
          style={{ color: palette.text }}
        >
          <CellBody data={data} />
        </div>
      </div>
    </div>
  )
}

function CellBody({ data }: { data: FixtureCellData }) {
  const bottom =
    data.outcome === "scheduled"
      ? formatLocalKickoffTime(data.match.utcKickoff)
      : data.scoreLine
        ? `${data.scoreLine.for}–${data.scoreLine.against}`
        : ""
  const liveTag =
    data.outcome === "live"
      ? data.liveMinute
        ? `${data.liveMinute}'`
        : "LIVE"
      : null
  return (
    <>
      <div className="flex items-center gap-1">
        <span className="text-[8px] uppercase tracking-widest opacity-75">vs</span>
        <Flag team={data.opponent} size={14} />
      </div>
      <div className="font-display text-[9px] tracking-[0.15em] leading-none mt-0.5">
        {data.opponent}
      </div>
      <div className="flex items-baseline justify-center gap-1 mt-1 leading-none">
        <span className="font-display text-[11px] tabular-nums">{bottom}</span>
        {liveTag && (
          <span className="font-display text-[8px] tracking-widest opacity-90">
            {liveTag}
          </span>
        )}
      </div>
    </>
  )
}
