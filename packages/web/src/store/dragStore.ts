import { create } from 'zustand'

export type DragOffset = {
  x: number
  y: number
}

export type DropTarget = {
  columnId: string
  insertBeforeId: string | null
}

export type DraggableItem = {
  id: string
  [key: string]: unknown
}

interface DragStoreState {
  isDragging: boolean
  draggedColumnId: string | null
  localColumns: DraggableItem[]
  placeholderIndex: number | null
  draggedCardId: string | null
  draggedCardData: DraggableItem | null
  dropTarget: DropTarget | null
  droppedCardId: string | null
  dragSourceColumnId: string | null
  dragOffset: DragOffset
  draggedWidth: number
  draggedHeight: number
  isScrolling: boolean
  startX: number
  scrollLeft: number
}

interface DragStoreActions {
  setDragging: (value: boolean) => void
  setDraggedColumnId: (id: string | null) => void
  setLocalColumns: (columns: DraggableItem[] | ((prev: DraggableItem[]) => DraggableItem[])) => void
  setPlaceholderIndex: (index: number | null) => void
  setDraggedCardId: (id: string | null) => void
  setDraggedCardData: (data: DraggableItem | null) => void
  setDropTarget: (target: DropTarget | null) => void
  setDroppedCardId: (id: string | null) => void
  setDragSourceColumnId: (id: string | null) => void
  setDragOffset: (offset: DragOffset) => void
  setDraggedWidth: (width: number) => void
  setDraggedHeight: (height: number) => void
  setIsScrolling: (scrolling: boolean) => void
  setStartX: (x: number) => void
  setScrollLeft: (left: number) => void
  clearCardDrag: () => void
  clearColumnDrag: () => void
}

type DragStore = DragStoreState & DragStoreActions

const initialState: DragStoreState = {
  isDragging: false,
  draggedColumnId: null,
  localColumns: [],
  placeholderIndex: null,
  draggedCardId: null,
  draggedCardData: null,
  dropTarget: null,
  droppedCardId: null,
  dragSourceColumnId: null,
  dragOffset: { x: 0, y: 0 },
  draggedWidth: 0,
  draggedHeight: 0,
  isScrolling: false,
  startX: 0,
  scrollLeft: 0,
}

export const useDragStore = create<DragStore>((set, get) => ({
  ...initialState,

  setDragging: (value) => set({ isDragging: value }),
  setDraggedColumnId: (id) => set({ draggedColumnId: id }),
  setLocalColumns: (columns) => {
    if (typeof columns === 'function') {
      set({ localColumns: columns(get().localColumns) })
    } else {
      set({ localColumns: columns })
    }
  },
  setPlaceholderIndex: (index) => set({ placeholderIndex: index }),
  setDraggedCardId: (id) => set({ draggedCardId: id }),
  setDraggedCardData: (data) => set({ draggedCardData: data }),
  setDropTarget: (target) => set({ dropTarget: target }),
  setDroppedCardId: (id) => set({ droppedCardId: id }),
  setDragSourceColumnId: (id) => set({ dragSourceColumnId: id }),
  setDragOffset: (offset) => set({ dragOffset: offset }),
  setDraggedWidth: (width) => set({ draggedWidth: width }),
  setDraggedHeight: (height) => set({ draggedHeight: height }),
  setIsScrolling: (scrolling) => set({ isScrolling: scrolling }),
  setStartX: (x) => set({ startX: x }),
  setScrollLeft: (left) => set({ scrollLeft: left }),

  clearCardDrag: () => set({
    draggedCardId: null,
    draggedCardData: null,
    dropTarget: null,
    droppedCardId: null,
    dragSourceColumnId: null,
  }),

  clearColumnDrag: () => set({
    draggedColumnId: null,
    placeholderIndex: null,
    localColumns: [],
  }),
}))
