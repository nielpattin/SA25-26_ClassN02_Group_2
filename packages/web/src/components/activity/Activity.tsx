import { useState } from 'react'
import { Avatar } from '../ui/Avatar'
import { Activity as ActivityType } from '../CardModalTypes'
import { formatDistanceToNow, format } from 'date-fns'
import { Button } from '../ui/Button'

interface ActivityProps {
  activities: ActivityType[]
}

function formatActivityMessage(activity: ActivityType) {
  const { action, targetType, changes } = activity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = changes as Record<string, any>

  switch (targetType) {
    case 'label':
      if (action === 'label_added') return `added label "${data?.name || 'unknown'}"`
      if (action === 'label_removed') return `removed label "${data?.name || 'unknown'}"`
      break
    case 'checklist':
      if (action === 'created') return `created checklist "${data?.title || 'unknown'}"`
      if (action === 'updated') return `renamed checklist to "${data?.title || 'unknown'}"`
      if (action === 'deleted') return `deleted checklist "${data?.title || 'unknown'}"`
      break
    case 'checklist_item':
      if (action === 'created') return `added "${data?.content || 'unknown'}" to checklist`
      if (action === 'updated') return `renamed checklist item to "${data?.content || 'unknown'}"`
      if (action === 'deleted') return `removed "${data?.content || 'unknown'}" from checklist`
      if (action === 'completed') return `completed "${data?.content || 'unknown'}"`
      if (action === 'uncompleted') return `uncompleted "${data?.content || 'unknown'}"`
      break
    case 'task':
      if (action === 'created') return 'created this task'
      if (action === 'archived') return 'archived this task'
      if (action === 'restored') return 'restored this task'
      if (action === 'deleted') return 'deleted this task'
      if (action === 'moved') return 'moved this task'
      
      if (action === 'updated' && changes) {
        const keys = Object.keys(changes)
        if (keys.length === 0) return 'updated this task'

        return keys.map(key => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const change = changes[key] as any
          const after = change?.after

          switch (key) {
            case 'title':
              return `changed title to "${after}"`
            case 'description':
              return 'updated description'
            case 'dueDate':
              if (!after) return 'removed due date'
              try {
                return `changed due date to ${format(new Date(after), 'PPP')}`
              } catch {
                return 'changed due date'
              }
            case 'priority':
              if (!after || after === 'none') return 'removed priority'
              return `set priority to ${after}`
            case 'coverImageUrl':
              return after ? 'added cover image' : 'removed cover image'
            case 'columnId':
              return 'moved task to another list'
            default:
              return `updated ${key}`
          }
        }).join(', ')
      }
      break
    case 'user':
      if (action === 'assigned') return `assigned this task to ${data?.userName || 'someone'}`
      if (action === 'unassigned') return `removed ${data?.userName || 'someone'} from this task`
      break
  }

  return action.replace(/_/g, ' ')
}

export function ActivitySection({ activities }: ActivityProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const displayedActivities = isExpanded ? activities : activities.slice(0, 3)
  const hasMore = activities.length > 3

  return (
    <div className="flex flex-col gap-5">
      {displayedActivities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3.5">
          <Avatar 
            src={activity.userImage} 
            fallback={activity.userName || 'U'} 
            size="sm" 
          />
          <div className="flex flex-col gap-1">
            <p className="m-0 text-[13px] leading-tight font-semibold text-black">
              <strong className="font-extrabold">{activity.userName}</strong> {formatActivityMessage(activity)}
            </p>
            <span className="text-[11px] font-extrabold tracking-widest text-black/40 uppercase">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      ))}
      
      {hasMore && (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 w-fit self-start"
        >
          {isExpanded ? 'Show less' : `Show more (${activities.length - 3} more)`}
        </Button>
      )}
    </div>
  )
}
