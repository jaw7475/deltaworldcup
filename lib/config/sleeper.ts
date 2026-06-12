/**
 * Sleeper league configuration. The 2026 rookie draft picks tracked on the
 * Draft Board tab live in this league.
 *
 * Set SLEEPER_LEAGUE_ID env var, or replace the fallback string below with the
 * actual league ID before deploying.
 */
export const SLEEPER_LEAGUE_ID =
  process.env.SLEEPER_LEAGUE_ID ?? "REPLACE_WITH_SLEEPER_LEAGUE_ID"

/** The rookie draft season the Draft Board tab visualises. */
export const DRAFT_SEASON = "2026"

/** Total rounds in the Sleeper draft. */
export const DRAFT_ROUNDS = 16

/** League size (also slot count). */
export const DRAFT_SLOTS = 12
