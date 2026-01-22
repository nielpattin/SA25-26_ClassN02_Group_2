import { Checklist } from '../checklist'
import { useChecklists } from '../../hooks'

interface TaskChecklistProps {
  taskId: string
  boardId?: string
}

export function TaskChecklist({ taskId, boardId }: TaskChecklistProps) {
  const { data: checklists = [] } = useChecklists(taskId)

  return (
    <>
      {checklists.map(checklist => (
        <Checklist key={checklist.id} checklist={checklist} cardId={taskId} boardId={boardId} />
      ))}
    </>
  )
}
