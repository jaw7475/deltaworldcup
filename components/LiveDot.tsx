interface LiveDotProps {
  title?: string
}

export function LiveDot({ title = "Live match in progress" }: LiveDotProps) {
  return (
    <span
      title={title}
      aria-label={title}
      className="inline-block size-2.5 rounded-full bg-neon-live shadow-neon-live animate-live-pulse"
    />
  )
}
