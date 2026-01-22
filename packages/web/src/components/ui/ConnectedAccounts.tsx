import { Github, Globe, Link2 } from 'lucide-react'

export function ConnectedAccounts() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center justify-center border border-dashed border-black/20 bg-black/5 py-12 text-center">
        <Link2 size={32} className="mb-4 text-gray-400" />
        <h3 className="text-sm font-bold tracking-widest text-black uppercase">No connected accounts</h3>
        <p className="mt-1 text-[10px] font-medium text-gray-400 uppercase">
          Connect your Google or GitHub account for quick login
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          disabled
          className="flex cursor-not-allowed items-center justify-center gap-3 border border-black bg-white px-6 py-4 text-xs font-bold tracking-widest text-gray-400 uppercase opacity-50 transition-all"
          title="Coming soon"
        >
          <Globe size={18} />
          Google
          <span className="ml-auto text-[8px]">Coming soon</span>
        </button>

        <button
          disabled
          className="flex cursor-not-allowed items-center justify-center gap-3 border border-black bg-white px-6 py-4 text-xs font-bold tracking-widest text-gray-400 uppercase opacity-50 transition-all"
          title="Coming soon"
        >
          <Github size={18} />
          GitHub
          <span className="ml-auto text-[8px]">Coming soon</span>
        </button>
      </div>
    </div>
  )
}
