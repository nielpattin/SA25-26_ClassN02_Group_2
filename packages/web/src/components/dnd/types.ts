export type CardDragData = {
  type: 'card'
  cardId: string
  columnId: string
  index: number
}

export type ColumnDragData = {
  type: 'column'
  columnId: string
  index: number
}

export type CardsListDragData = {
  type: 'cards-list'
  columnId: string
}

export type DragData = CardDragData | ColumnDragData | CardsListDragData

export const isCardData = (data: Record<string, unknown>): data is CardDragData => {
  return data.type === 'card'
}

export const isColumnData = (data: Record<string, unknown>): data is ColumnDragData => {
  return data.type === 'column'
}

export const isCardsListData = (data: Record<string, unknown>): data is CardsListDragData => {
  return data.type === 'cards-list'
}
