export function LiveLegend() {
  return (
    <div className="mt-6 flex justify-center px-2">
      <div className="inline-flex items-center gap-2 sm:gap-2.5 rounded-full bg-bg-raised/70 ring-1 ring-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-base text-white/70 font-display tracking-normal sm:tracking-wider text-center">
        <span className="shrink-0 inline-block size-2 sm:size-2.5 rounded-full bg-neon-live shadow-neon-live animate-live-pulse" />
        <span>
          means a member has a live match contributing{" "}
          <span className="text-white">provisional</span> points
        </span>
      </div>
    </div>
  )
}
