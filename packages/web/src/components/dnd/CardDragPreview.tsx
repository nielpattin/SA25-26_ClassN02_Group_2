type CardLabel = {
  id: string
  name: string
  color: string
}

type CardDragPreviewProps = {
  title: string
  labels?: CardLabel[]
}

export const CardDragPreview = ({ title, labels }: CardDragPreviewProps) => {
  return (
    <div className="card-drag-preview">
      {labels && labels.length > 0 && (
        <div className="card-drag-preview-labels">
          {labels.map(label => (
            <span
              key={label.id}
              className="card-drag-preview-label"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
      <div className="card-drag-preview-title">
        {title}
      </div>
    </div>
  )
}
