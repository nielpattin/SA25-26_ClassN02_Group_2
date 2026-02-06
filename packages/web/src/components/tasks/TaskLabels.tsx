import { LabelSection } from '../labels/Labels'
import {
  useLabels,
  useCreateLabel,
  useDeleteLabel,
  useToggleLabel,
} from '../../hooks'

interface TaskLabelsProps {
  taskId: string
  boardId: string
  cardLabels: string[]
}

export function TaskLabels({ taskId, boardId, cardLabels }: TaskLabelsProps) {
  const { data: boardLabels = [] } = useLabels(boardId)
  const createLabel = useCreateLabel()
  const deleteLabel = useDeleteLabel(boardId)
  const toggleLabel = useToggleLabel(taskId, boardId)

  return (
    <LabelSection
      cardLabels={cardLabels || []}
      allLabels={boardLabels}
      onToggle={labelId => {
        const isCurrentlyActive = (cardLabels || []).includes(labelId)
        toggleLabel.mutate({ labelId, isCurrentlyActive })
      }}
      onAdd={(name, color) => {
        createLabel.mutate({ name, color, boardId }, {
          onSuccess: (label) => {
            if (label?.id) {
              toggleLabel.mutate({ labelId: label.id, isCurrentlyActive: false })
            }
          },
        })
      }}
      onDelete={labelId => {
        deleteLabel.mutate(labelId)
      }}
    />
  )
}
