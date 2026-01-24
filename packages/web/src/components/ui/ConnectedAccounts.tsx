import { Github, Globe, Link2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { signIn, unlinkAccount } from '../../api/auth'
import { useAccounts } from '../../hooks/useAccounts'

export function ConnectedAccounts() {
  const { data: accounts, refetch, isLoading: isLoadingAccounts } = useAccounts()
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const isConnected = (provider: string) => accounts?.some((acc) => acc.providerId === provider)

  const handleConnect = async (provider: string) => {
    setLoadingProvider(provider)
    try {
      const { error } = await signIn.social({
        provider: provider as 'github',
        callbackURL: window.location.href,
      })
      if (error) {
        alert(error.message || 'Failed to connect account')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingProvider(null)
    }
  }

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${provider} account?`)) return
    setLoadingProvider(provider)
    try {
      const { error } = await unlinkAccount({ providerId: provider })
      if (error) {
        alert(error.message || 'Failed to disconnect account')
      } else {
        await refetch()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingProvider(null)
    }
  }

  const githubConnected = isConnected('github')

  if (isLoadingAccounts) {
    return (
      <div className="flex h-40 items-center justify-center border border-black bg-black/5">
        <Loader2 size={24} className="animate-spin text-black/20" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {!githubConnected && (
        <div className="flex flex-col items-center justify-center border border-dashed border-black/20 bg-black/5 py-12 text-center">
          <Link2 size={32} className="mb-4 text-gray-400" />
          <h3 className="text-sm font-bold tracking-widest text-black uppercase">No connected accounts</h3>
          <p className="mt-1 text-[10px] font-medium text-gray-400 uppercase">
            Connect your GitHub account for quick login
          </p>
        </div>
      )}

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
          onClick={() => (githubConnected ? handleDisconnect('github') : handleConnect('github'))}
          disabled={loadingProvider === 'github'}
          className={`shadow-brutal-sm hover:shadow-brutal flex cursor-pointer items-center justify-center gap-3 border border-black px-6 py-4 text-xs font-bold tracking-widest uppercase transition-all hover:-translate-0.5 active:translate-0 active:shadow-none ${
            githubConnected ? 'bg-danger-bg text-black' : 'bg-white text-black'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {loadingProvider === 'github' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Github size={18} />
          )}
          GitHub
          <span className="ml-auto text-[10px] font-black">
            {githubConnected ? 'DISCONNECT' : 'CONNECT'}
          </span>
        </button>
      </div>
    </div>
  )
}
