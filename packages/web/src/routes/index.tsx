import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSession } from '../api/auth'
import { AuthModal } from '../components/auth/AuthModal'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { data: session } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const navigate = useNavigate()

  const handleStartClick = () => {
    if (session) {
      navigate({ to: '/dashboard' })
    } else {
      setShowAuthModal(true)
    }
  }

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          // If logged in after modal closes, go to dashboard
          if (session) {
            navigate({ to: '/dashboard' })
          }
        }}
      />
      <div className="min-h-screen bg-canvas flex flex-col items-center">
        <main className="w-full max-w-300 px-12 pt-32 pb-24 flex flex-col items-center text-center">
          <div className="flex flex-col items-center">
            <div className="bg-black text-white font-heading text-[24px] font-extrabold px-6 py-2 border border-black mb-10 shadow-brutal-md">KYTE</div>
            <h1 className="m-0 font-heading text-[64px] font-bold leading-tight tracking-tight text-black uppercase mb-6 max-w-200">Organize your work, simply.</h1>
            <p className="m-0 text-[20px] font-bold text-black opacity-70 uppercase tracking-wide max-w-150 mb-12">
              A clean, minimalist Kanban board for personal and team productivity.
            </p>
            <div className="flex gap-6">
              <button 
                onClick={handleStartClick} 
                className="px-8 py-4 bg-black border border-black text-white font-extrabold uppercase tracking-widest text-[14px] cursor-pointer hover:bg-accent hover:text-black hover:shadow-brutal-lg hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                Start Free
              </button>
              <a 
                href="https://github.com" 
                className="px-8 py-4 bg-white border border-black text-black font-extrabold uppercase tracking-widest text-[14px] hover:bg-gray-200 hover:shadow-brutal-lg hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                View Source
              </a>
            </div>
          </div>
        </main>

        <section className="w-full max-w-300 px-12 py-24 border-t border-black">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white border border-black p-8 shadow-brutal-md hover:-translate-y-1 hover:shadow-brutal-xl transition-all">
              <h3 className="m-0 mb-4 font-heading text-xl font-extrabold text-black uppercase">Team Stays in Sync</h3>
              <p className="m-0 text-sm font-semibold leading-relaxed text-black/70">Everyone sees updates the moment they happen. No refresh, no conflicts.</p>
            </div>
            <div className="bg-white border border-black p-8 shadow-brutal-md hover:-translate-y-1 hover:shadow-brutal-xl transition-all">
              <h3 className="m-0 mb-4 font-heading text-xl font-extrabold text-black uppercase">Minimalist by Design</h3>
              <p className="m-0 text-sm font-semibold leading-relaxed text-black/70">A clean interface that gets out of your way. Focus on work, not the tool.</p>
            </div>
            <div className="bg-white border border-black p-8 shadow-brutal-md hover:-translate-y-1 hover:shadow-brutal-xl transition-all">
              <h3 className="m-0 mb-4 font-heading text-xl font-extrabold text-black uppercase">Instant Everything</h3>
              <p className="m-0 text-sm font-semibold leading-relaxed text-black/70">Drag, drop, edit — every action feels immediate.</p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-300 px-12 py-16 flex flex-col items-center border-t border-black">
          <p className="m-0 mb-8 text-[11px] font-extrabold uppercase tracking-[0.2em] text-black/40">BUILT WITH</p>
          <div className="flex flex-wrap justify-center gap-6">
            <span className="px-4 py-2 bg-white border border-black text-black font-extrabold uppercase text-[12px] shadow-brutal-sm hover:-translate-y-0.5 transition-all">Bun</span>
            <span className="px-4 py-2 bg-white border border-black text-black font-extrabold uppercase text-[12px] shadow-brutal-sm hover:-translate-y-0.5 transition-all">Elysia</span>
            <span className="px-4 py-2 bg-white border border-black text-black font-extrabold uppercase text-[12px] shadow-brutal-sm hover:-translate-y-0.5 transition-all">React</span>
            <span className="px-4 py-2 bg-white border border-black text-black font-extrabold uppercase text-[12px] shadow-brutal-sm hover:-translate-y-0.5 transition-all">PostgreSQL</span>
            <span className="px-4 py-2 bg-white border border-black text-black font-extrabold uppercase text-[12px] shadow-brutal-sm hover:-translate-y-0.5 transition-all">Drizzle</span>
          </div>
        </section>

        <footer className="w-full py-12 flex flex-col items-center gap-4 bg-white border-t border-black">
          <div className="flex items-center gap-4 text-[13px] font-extrabold uppercase">
            <span className="text-accent bg-black px-2 py-0.5">v0.1.0</span>
            <span className="text-black/20">•</span>
            <a href="https://github.com/nielpattin/SA25-26_ClassN02_Group_2" className="text-black hover:underline underline-offset-4">Star on GitHub</a>
          </div>
        </footer>
      </div>
    </>
  )
}
