"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatLocal, useUserTimeZone } from "@/lib/time/local"

interface PositionHistoryChartProps {
  history: { computedAt: string; rank: number }[]
}

export function PositionHistoryChart({ history }: PositionHistoryChartProps) {
  const tz = useUserTimeZone()

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-bg-raised/50 p-6 text-center text-white/50 text-sm font-display tracking-wider uppercase">
        Position history starts after the first finished match.
      </div>
    )
  }

  const data = history.map((p) => ({
    t: new Date(p.computedAt).getTime(),
    rank: p.rank,
    label: formatLocal(
      p.computedAt,
      { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
      tz
    ),
  }))

  const maxRank = Math.max(...data.map((d) => d.rank))

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 4 }}>
          <XAxis dataKey="label" stroke="#ffffff66" fontSize={11} />
          <YAxis
            reversed
            domain={[1, maxRank]}
            allowDecimals={false}
            stroke="#ffffff66"
            fontSize={11}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "#141425",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#ffffffaa" }}
            itemStyle={{ color: "#00f5d4" }}
          />
          <Line
            type="monotone"
            dataKey="rank"
            stroke="#00f5d4"
            strokeWidth={2}
            dot={{ r: 3, fill: "#00f5d4" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
