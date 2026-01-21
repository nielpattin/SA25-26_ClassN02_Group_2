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
            navigate({ to: '/boards' })
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
      navigate({ to: '/boards' })
          }
        }}
      />
      <div className="bg-canvas flex min-h-screen flex-col items-center">
        <main className="flex w-full max-w-300 flex-col items-center px-12 pt-32 pb-24 text-center">
          <div className="flex flex-col items-center">
            <div className="font-heading shadow-brutal-md mb-10 border border-black bg-black px-6 py-2 text-[24px] font-extrabold text-white">KYTE</div>
            <h1 className="font-heading m-0 mb-6 max-w-200 text-[64px] leading-tight font-bold tracking-tight text-black uppercase">Organize your work, simply.</h1>
            <p className="m-0 mb-12 max-w-150 text-[20px] font-bold tracking-wide text-black uppercase opacity-70">
              A clean, minimalist Kanban board for personal and team productivity.
            </p>
            <div className="flex gap-6">
              <button 
                onClick={handleStartClick} 
                className="hover:bg-accent hover:shadow-brutal-lg cursor-pointer border border-black bg-black px-8 py-4 text-[14px] font-extrabold tracking-widest text-white uppercase transition-all hover:-translate-x-1 hover:-translate-y-1 hover:text-black"
              >
                Start Free
              </button>
              <a 
                href="https://github.com" 
                className="hover:shadow-brutal-lg border border-black bg-white px-8 py-4 text-[14px] font-extrabold tracking-widest text-black uppercase transition-all hover:-translate-x-1 hover:-translate-y-1 hover:bg-gray-200"
              >
                View Source
              </a>
            </div>
          </div>
        </main>

        <section className="w-full max-w-300 border-t border-black px-12 py-24">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="shadow-brutal-md hover:shadow-brutal-xl border border-black bg-white p-8 transition-all hover:-translate-y-1">
              <h3 className="font-heading m-0 mb-4 text-xl font-extrabold text-black uppercase">Team Stays in Sync</h3>
              <p className="m-0 text-sm/relaxed font-semibold text-black/70">Everyone sees updates the moment they happen. No refresh, no conflicts.</p>
            </div>
            <div className="shadow-brutal-md hover:shadow-brutal-xl border border-black bg-white p-8 transition-all hover:-translate-y-1">
              <h3 className="font-heading m-0 mb-4 text-xl font-extrabold text-black uppercase">Minimalist by Design</h3>
              <p className="m-0 text-sm/relaxed font-semibold text-black/70">A clean interface that gets out of your way. Focus on work, not the tool.</p>
            </div>
            <div className="shadow-brutal-md hover:shadow-brutal-xl border border-black bg-white p-8 transition-all hover:-translate-y-1">
              <h3 className="font-heading m-0 mb-4 text-xl font-extrabold text-black uppercase">Instant Everything</h3>
              <p className="m-0 text-sm/relaxed font-semibold text-black/70">Drag, drop, edit — every action feels immediate.</p>
            </div>
          </div>
        </section>

        <section className="flex w-full max-w-300 flex-col items-center border-t border-black px-12 py-16">
          <p className="m-0 mb-8 text-[11px] font-extrabold tracking-[0.2em] text-black/40 uppercase">BUILT WITH</p>
          <div className="flex flex-wrap justify-center gap-6">
            <span className="shadow-brutal-sm border border-black bg-white px-4 py-2 text-[12px] font-extrabold text-black uppercase transition-all hover:-translate-y-0.5">Bun</span>
            <span className="shadow-brutal-sm border border-black bg-white px-4 py-2 text-[12px] font-extrabold text-black uppercase transition-all hover:-translate-y-0.5">Elysia</span>
            <span className="shadow-brutal-sm border border-black bg-white px-4 py-2 text-[12px] font-extrabold text-black uppercase transition-all hover:-translate-y-0.5">React</span>
            <span className="shadow-brutal-sm border border-black bg-white px-4 py-2 text-[12px] font-extrabold text-black uppercase transition-all hover:-translate-y-0.5">PostgreSQL</span>
            <span className="shadow-brutal-sm border border-black bg-white px-4 py-2 text-[12px] font-extrabold text-black uppercase transition-all hover:-translate-y-0.5">Drizzle</span>
          </div>
        </section>

        <footer className="flex w-full flex-col items-center gap-4 border-t border-black bg-white py-12">
          <div className="flex items-center gap-4 text-[13px] font-extrabold uppercase">
            <span className="text-accent bg-black px-2 py-0.5">v0.1.0</span>
            <span className="text-black/20">•</span>
            <a href="https://github.com/nielpattin/SA25-26_ClassN02_Group_2" className="text-black underline-offset-4 hover:underline">Star on GitHub</a>
          </div>
        </footer>
      </div>
    </>
  )
}
