import type { PresenceUser } from '../../hooks/useBoardSocket'

type PresenceStripProps = {
  presence: PresenceUser[]
}

export function PresenceStrip({ presence }: PresenceStripProps) {
  const displayLimit = 5
  const displayUsers = presence.slice(0, displayLimit)
  const overflow = presence.length - displayLimit

  return (
    <div className="flex items-center -space-x-2">
      {displayUsers.map((user) => (
        <div
          key={user.id}
          className="shadow-brutal-sm flex h-8 w-8 items-center justify-center border border-black bg-white ring-2 ring-white"
          title={user.name}
        >
          <div className="flex h-full w-full items-center justify-center text-[11px] font-bold">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="shadow-brutal-sm bg-accent flex h-8 w-8 items-center justify-center border border-black text-[11px] font-bold ring-2 ring-white"
          title={`${overflow} more active`}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
