import { useCallback, useEffect, useRef } from 'react'

// Two panes with a draggable divider. `percent` is the left pane's width in
// percent of the layout, kept by the caller (a store), so it survives unmounts.
// Dragging calls onPercentChange with a value clamped to min..max.
export default function SplitLayout({ left, right, percent, onPercentChange, min, max }) {
  const containerRef = useRef(null)
  const draggingRef = useRef(false)
  // Latest props for the window listeners, which are added only once.
  const latestRef = useRef({ onPercentChange, min, max })
  useEffect(() => {
    latestRef.current = { onPercentChange, min, max }
  }, [onPercentChange, min, max])

  const handleMouseDown = useCallback(() => {
    draggingRef.current = true
  }, [])

  useEffect(() => {
    function handleMouseMove(event) {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const value = ((event.clientX - rect.left) / rect.width) * 100
      const { onPercentChange, min, max } = latestRef.current
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

  return (
    <div className="split-layout" ref={containerRef}>
      <div className="split-pane-left" style={{ width: `${percent}%` }}>
        {left}
      </div>
      <div className="divider" onMouseDown={handleMouseDown} />
      <div className="split-pane-right">{right}</div>
    </div>
  )
}
