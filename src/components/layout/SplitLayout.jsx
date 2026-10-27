import { useCallback, useEffect, useRef } from 'react'

// Two panes with a draggable divider: side by side, or stacked when
// `vertical` (first on top). `percent` is the first pane's size (width, or
// height when vertical) in percent of the layout, kept by the caller (a store),
// so it survives unmounts. Dragging calls onPercentChange clamped to min..max.
export default function SplitLayout({ first, second, vertical = false, percent, onPercentChange, min, max }) {
  const containerRef = useRef(null)
  const draggingRef = useRef(false)
  // Latest props for the window listeners, which are added only once.
  const latestRef = useRef({ vertical, onPercentChange, min, max })
  useEffect(() => {
    latestRef.current = { vertical, onPercentChange, min, max }
  }, [vertical, onPercentChange, min, max])

  const handleMouseDown = useCallback(() => {
    draggingRef.current = true
  }, [])

  useEffect(() => {
    function handleMouseMove(event) {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const { vertical, onPercentChange, min, max } = latestRef.current
      const value = vertical
        ? ((event.clientY - rect.top) / rect.height) * 100
        : ((event.clientX - rect.left) / rect.width) * 100
      onPercentChange(Math.min(max, Math.max(min, value)))
    }

    function handleMouseUp() {
      draggingRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const size = vertical ? { height: `${percent}%` } : { width: `${percent}%` }
  return (
    <div className={vertical ? 'split-layout vertical' : 'split-layout'} ref={containerRef}>
      <div className="split-pane-first" style={size}>
        {first}
      </div>
      <div className="divider" onMouseDown={handleMouseDown} />
      <div className="split-pane-second">{second}</div>
    </div>
  )
}
