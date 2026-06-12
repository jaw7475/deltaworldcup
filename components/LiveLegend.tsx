export function LiveLegend() {
  return (
    <div className="mt-6 flex justify-center">
      <div className="inline-flex items-center gap-2.5 rounded-full bg-bg-raised/70 ring-1 ring-white/10 px-4 py-2 text-sm sm:text-base text-white/70 font-display tracking-wider">
        <span className="inline-block size-2.5 rounded-full bg-neon-live shadow-neon-live animate-live-pulse" />
        <span>
          means a member has a live match contributing{" "}
          <span className="text-white">provisional</span> points
        </span>
      </div>
    </div>
  )
}
