import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SendHorizonal, RotateCcw } from 'lucide-react'
import Message, { type MessageRole } from './Message'
import { chat } from '../services/api'

type ChatInterfaceProps = {
  sessionId: string
  onReset: () => void
}

type ChatMessage = {
  id: string
  role: MessageRole
  content?: string
}

const techbotImagePath = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20200%20200'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23FFD54A'/%3E%3Ctext%20x='50%25'%20y='50%25'%20font-size='72'%20text-anchor='middle'%20dominant-baseline='central'%20fill='%23000'%20font-family='Arial'%3ETB%3C/text%3E%3C/svg%3E"

export default function ChatInterface({ sessionId, onReset }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Video loaded. Ask your question.',
    },
  ])
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, sending])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt || sending) {
      return
    }

    const userMessageId = crypto.randomUUID()
    const pendingMessageId = crypto.randomUUID()

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: userMessageId, role: 'user', content: trimmedPrompt },
      { id: pendingMessageId, role: 'pending' },
    ])
    setPrompt('')
    setSending(true)

    try {
      const answer = await chat(sessionId, trimmedPrompt)

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === pendingMessageId
            ? {
                ...message,
                role: 'assistant',
                content:
                  answer || 'I could not find a grounded answer in the current video context.',
              }
            : message,
        ),
      )
    } catch {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === pendingMessageId
            ? {
                ...message,
                role: 'assistant',
                content:
                  'The chat request failed. Please try again once the backend is available.',
              }
            : message,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="w-full max-w-4xl animate-floatIn">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-glow backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.12),transparent_35%),radial-gradient(circle_at_center_right,rgba(34,211,238,0.14),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))]" />
        <div className="relative flex flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <p className="text-sm font-medium text-slate-200">Chat</p>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-slate-200 transition hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Video
            </button>
          </header>

          <div className="flex min-h-[70vh] flex-col">
            <div
              ref={scrollRef}
              className="scrollbar-thin-glass flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6 lg:px-7"
            >
              {messages.map((message) => (
                <Message
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  avatar={techbotImagePath}
                />
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-white/10 bg-black/[0.12] px-4 py-4 sm:px-6 lg:px-7"
            >
              <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl transition duration-300 focus-within:border-cyan-300/40 focus-within:bg-white/10 focus-within:shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_36px_rgba(34,211,238,0.12)]">
                <input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  type="text"
                  placeholder="Type your question..."
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none sm:text-base"
                />
                <button
                  type="submit"
                  disabled={sending || !prompt.trim()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 text-white shadow-[0_12px_36px_rgba(139,92,246,0.32)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SendHorizonal className="h-5 w-5" />
                </button>
              </label>

              <div className="mt-3 text-xs text-slate-400">Session ID: {sessionId}</div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
