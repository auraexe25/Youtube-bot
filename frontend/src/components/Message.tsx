import LoadingIndicator from './LoadingIndicator'

export type MessageRole = 'assistant' | 'user' | 'pending'

type MessageProps = {
  role: MessageRole
  content?: string
  avatar?: string
}

export default function Message({ role, content, avatar }: MessageProps) {
  if (role === 'pending') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[82%] rounded-3xl border border-cyan-300/15 bg-white/[0.06] px-4 py-3 text-cyan-50 shadow-glow backdrop-blur-xl">
          <LoadingIndicator compact />
        </div>
      </div>
    )
  }

  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] shadow-glow backdrop-blur-sm">
          {avatar ? (
            <img
              src={avatar}
              alt="Assistant"
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <span className="text-sm font-semibold text-amber-200">TB</span>
          )}
        </div>
      ) : null}

      <div
        className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-glow backdrop-blur-xl ${
          isUser
            ? 'border border-white/10 bg-white/10 text-slate-100'
            : 'border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-500/18 via-indigo-500/12 to-cyan-500/14 text-white'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
