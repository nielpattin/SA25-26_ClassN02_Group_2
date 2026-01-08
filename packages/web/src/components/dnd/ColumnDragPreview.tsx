type ColumnDragPreviewProps = {
  name: string
  cardCount: number
}

export const ColumnDragPreview = ({ name, cardCount }: ColumnDragPreviewProps) => {
  return (
    <div className="column-drag-preview">
      {name}
      <span className="column-drag-preview-count">[{cardCount}]</span>
    </div>
  )
}
