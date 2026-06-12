interface ComingSoonProps {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-bg-raised/40 p-10 sm:p-14 text-center">
      <div className="font-display text-xs uppercase tracking-[0.4em] text-white/40">
        Coming soon
      </div>
      <h2 className="mt-3 font-display text-2xl sm:text-3xl uppercase tracking-widest neon-text-magenta">
        {title}
      </h2>
      {description && (
        <p className="mt-4 max-w-md mx-auto text-white/55 text-sm">
          {description}
        </p>
      )}
    </div>
  )
}
