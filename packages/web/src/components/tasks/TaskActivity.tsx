import { History } from 'lucide-react'
import { ActivitySection } from '../activity/Activity'
import { useTaskActivity } from '../../hooks'

interface TaskActivityProps {
  taskId: string
}

export function TaskActivity({ taskId }: TaskActivityProps) {
  const { data: activities = [] } = useTaskActivity(taskId)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading m-0 flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
        <History size={14} /> Activity
      </h3>
      <ActivitySection activities={activities} />
    </div>
  )
}
