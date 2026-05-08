type LoadingIndicatorProps = {
  label?: string
  compact?: boolean
}

export default function LoadingIndicator({
  label = 'AI is generating...',
  compact = false,
}: LoadingIndicatorProps) {
  return (
    <div className={`flex items-center gap-3 ${compact ? 'text-sm' : 'text-base'}`}>
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400/25 blur-sm animate-pulseSoft" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full border border-cyan-200/70 border-t-transparent animate-spin" />
      </span>
      <span className="bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-indigo-200 bg-[length:200%_100%] bg-clip-text font-medium text-transparent animate-shimmer">
        {label}
      </span>
    </div>
  )
}
