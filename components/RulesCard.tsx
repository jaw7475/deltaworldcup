interface RuleProps {
  label: string
  accent: "cyan" | "magenta" | "yellow" | "violet" | "green"
  children: React.ReactNode
}

const ACCENT_CLASS: Record<RuleProps["accent"], string> = {
  cyan: "text-neon-cyan ring-neon-cyan/40 bg-neon-cyan/10",
  magenta: "text-neon-magenta ring-neon-magenta/40 bg-neon-magenta/10",
  yellow: "text-neon-yellow ring-neon-yellow/40 bg-neon-yellow/10",
  violet: "text-[#b16cff] ring-[#b16cff]/40 bg-[#b16cff]/10",
  green: "text-neon-green ring-neon-green/40 bg-neon-green/10",
}

function Rule({ label, accent, children }: RuleProps) {
  return (
    <li className="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-3">
      <span
        className={`self-start shrink-0 sm:mt-0.5 inline-flex items-center justify-center rounded-full px-2 py-0.5 ring-1 font-display tracking-widest uppercase text-[10px] ${ACCENT_CLASS[accent]}`}
      >
        {label}
      </span>
      <span className="text-sm text-white/75 leading-relaxed">{children}</span>
    </li>
  )
}

export function RulesCard() {
  return (
    <section
      aria-label="How scoring works"
      className="rounded-2xl bg-bg-raised/60 ring-1 ring-white/10 p-5 sm:p-6"
    >
      <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-display mb-4">
        How it works
      </div>
      <ul className="space-y-3">
        <Rule label="How to Win" accent="cyan">
          Most points across all 4 teams wins{" "}
          <span className="text-white font-medium">#1 overall pick</span>.
        </Rule>
        <Rule label="Group Stage" accent="yellow">
          <span className="text-white">Win 3 points</span> · Draw 1 point ·
          Loss 0 points.
        </Rule>
        <Rule label="Knockout Stage" accent="magenta">
          <span className="text-white">Win 3 points</span> (any way) · Lose in
          extra time or on penalties{" "}
          <span className="text-white">1 point</span> · Lose in regulation 0
          points.
        </Rule>
        <Rule label="Tiebreak" accent="violet">
          Total goals scored. Extra-time goals count;{" "}
          <span className="text-white">shootout goals don&apos;t</span>.
        </Rule>
      </ul>
    </section>
  )
}
