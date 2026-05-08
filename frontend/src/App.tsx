import { useEffect, useState } from 'react'
import LandingPage from './components/LandingPage'
import ChatInterface from './components/ChatInterface'

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Video Chat'
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.2),transparent_25%),radial-gradient(circle_at_70%_35%,rgba(34,211,238,0.18),transparent_28%),linear-gradient(135deg,#050816_0%,#07121f_45%,#050816_100%)]" />
      <div className="absolute left-[-6rem] top-[-4rem] h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-3xl animate-drift" />
      <div className="absolute right-[-6rem] top-[10rem] h-[30rem] w-[30rem] rounded-full bg-cyan-500/20 blur-3xl animate-drift [animation-delay:-6s]" />
      <div className="absolute bottom-[-8rem] left-[24%] h-[24rem] w-[24rem] rounded-full bg-indigo-600/20 blur-3xl animate-pulseSoft" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {sessionId ? (
          <ChatInterface sessionId={sessionId} onReset={() => setSessionId(null)} />
        ) : (
          <LandingPage onLoaded={setSessionId} />
        )}
      </div>
    </main>
  )
}
