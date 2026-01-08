type DropIndicatorProps = {
  edge: 'top' | 'bottom' | 'left' | 'right'
  gap?: number
}

export const DropIndicator = ({ edge, gap = 0 }: DropIndicatorProps) => {
  const isHorizontal = edge === 'top' || edge === 'bottom'
  
  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: 'var(--colors-accent)',
    zIndex: 10,
  }

  if (isHorizontal) {
    lineStyle.left = 0
    lineStyle.right = 0
    lineStyle.height = '2px'
    if (edge === 'top') {
      lineStyle.top = `-${gap}px`
    } else {
      lineStyle.bottom = `-${gap}px`
    }
  } else {
    lineStyle.top = 0
    lineStyle.bottom = 0
    lineStyle.width = '2px'
    if (edge === 'left') {
      lineStyle.left = `-${gap}px`
    } else {
      lineStyle.right = `-${gap}px`
    }
  }

  const capStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: 'var(--colors-accent)',
  }

  if (isHorizontal) {
    capStyle.width = '2px'
    capStyle.height = '6px'
    if (edge === 'top') {
      capStyle.top = '-3px'
    } else {
      capStyle.bottom = '-3px'
    }
  } else {
    capStyle.height = '2px'
    capStyle.width = '6px'
    if (edge === 'left') {
      capStyle.left = '-3px'
    } else {
      capStyle.right = '-3px'
    }
  }

  return (
    <div style={lineStyle}>
      <div style={{ ...capStyle, [isHorizontal ? 'left' : 'top']: 0 }} />
      <div style={{ ...capStyle, [isHorizontal ? 'right' : 'bottom']: 0 }} />
    </div>
  )
}
