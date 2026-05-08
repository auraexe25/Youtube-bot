import { useState, type FormEvent } from 'react'
import { ArrowRight, LoaderCircle, Link as LinkIcon } from 'lucide-react'
import { loadVideo } from '../services/api'

type LandingPageProps = {
  onLoaded: (sessionId: string) => void
}

export default function LandingPage({ onLoaded }: LandingPageProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedUrl = youtubeUrl.trim()
    if (!trimmedUrl) {
      setError('Paste a valid YouTube URL to begin.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const sessionId = await loadVideo(trimmedUrl)
      if (!sessionId) {
        throw new Error('The backend did not return a session_id.')
      }

      onLoaded(sessionId)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to load the video right now. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full max-w-3xl animate-floatIn">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-glow backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.16),transparent_38%),radial-gradient(circle_at_center_right,rgba(34,211,238,0.15),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
        <div className="relative mt-2 space-y-6">
          <h1 className="max-w-xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
            Enter the video URL
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block rounded-[1.4rem] border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl transition duration-300 focus-within:border-cyan-300/40 focus-within:bg-white/10 focus-within:shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_36px_rgba(34,211,238,0.12)]">
              <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                <LinkIcon className="h-3.5 w-3.5" />
                YouTube URL
              </span>
              <input
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                className="w-full border-0 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
              />
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-fuchsia-300/20 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 px-5 py-4 font-medium text-white shadow-[0_16px_50px_rgba(139,92,246,0.35)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Loading video...
                </>
              ) : (
                <>
                  Load Video
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
