import { getTeam } from "@/lib/config/teams"

interface FlagProps {
  team: string
  size?: number
  glow?: boolean
  className?: string
}

/**
 * Renders a country flag for a team code.
 * Uses country-flag-icons static SVGs served via CDN. For TBD / unknown codes
 * (iso2 === "un") and split codes like gb-eng / gb-wls, falls back to a neon
 * placeholder.
 */
export function Flag({ team, size = 28, glow = false, className }: FlagProps) {
  const t = getTeam(team)
  const iso2 = t?.iso2?.toLowerCase()
  const showFallback = !iso2 || iso2 === "un"
  const usesSubdivision = iso2?.startsWith("gb-")

  const sharedStyle = {
    width: size,
    height: Math.round(size * 0.66),
  } as const

  if (showFallback) {
    return (
      <span
        title={t?.name ?? team}
        aria-label={t?.name ?? team}
        className={`inline-flex items-center justify-center rounded-sm bg-bg-raised text-[10px] font-display tracking-tight text-white/60 ring-1 ring-white/10 ${
          glow ? "shadow-neon-cyan" : ""
        } ${className ?? ""}`}
        style={sharedStyle}
      >
        {team.slice(0, 3)}
      </span>
    )
  }

  if (usesSubdivision) {
    // country-flag-icons doesn't host gb-eng/gb-wls in the standard set — use a
    // text fallback for now.
    return (
      <span
        title={t?.name ?? team}
        aria-label={t?.name ?? team}
        className={`inline-flex items-center justify-center rounded-sm bg-bg-raised text-[10px] font-display tracking-tight text-neon-cyan ring-1 ring-neon-cyan/40 ${
          glow ? "shadow-neon-cyan" : ""
        } ${className ?? ""}`}
        style={sharedStyle}
      >
        {team.slice(0, 3)}
      </span>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/${iso2}.svg`}
      alt={t?.name ?? team}
      title={t?.name ?? team}
      width={sharedStyle.width}
      height={sharedStyle.height}
      className={`rounded-sm ring-1 ring-white/15 ${
        glow ? "shadow-neon-cyan" : ""
      } ${className ?? ""}`}
      loading="lazy"
    />
  )
}
