import { useRef } from 'react'

// Two panes with a draggable divider: side by side, or stacked when
// `vertical` (first on top). `percent` is the first pane's size (width, or
// height when vertical) in percent of the layout, kept by the caller (a store),
// so it survives unmounts. Dragging calls onPercentChange clamped to min..max.
// The divider captures the pointer, so it gets every move and the release even
// over the canvas or outside the window; losing the capture always ends the drag.
// Side by side, the first pane has a CSS min-width (276 px, J0.1), and the
// divider stops there instead of moving on past it.
export default function SplitLayout({ first, second, vertical = false, percent, onPercentChange, min, max }) {
  const containerRef = useRef(null)
  const firstRef = useRef(null)
  const draggingRef = useRef(false)
  // The first pane's smallest width in percent of the layout, measured when a
  // drag starts (side by side only).
  const contentMinRef = useRef(0)

  // The first pane's smallest width in percent of the layout: its width with
  // a requested width of 0, which its CSS min-width raises.
  function contentMinPercent() {
    const pane = firstRef.current
    const layoutWidth = containerRef.current.getBoundingClientRect().width
    if (!pane || !layoutWidth) return 0
    const requested = pane.style.width
    pane.style.width = '0px'
    const contentWidth = pane.getBoundingClientRect().width
    pane.style.width = requested
    return (contentWidth / layoutWidth) * 100
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return
    // No text selection or native drag while dragging.
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    contentMinRef.current = vertical ? 0 : contentMinPercent()
  }

  function handlePointerMove(event) {
    if (!draggingRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const value = vertical
      ? ((event.clientY - rect.top) / rect.height) * 100
      : ((event.clientX - rect.left) / rect.width) * 100
    onPercentChange(Math.min(max, Math.max(min, contentMinRef.current, value)))
  }

  function endDrag(event) {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const size = vertical ? { height: `${percent}%` } : { width: `${percent}%` }
  return (
    <div className={vertical ? 'split-layout vertical' : 'split-layout'} ref={containerRef}>
      <div className="split-pane-first" style={size} ref={firstRef}>
        {first}
      </div>
      <div
        className="divider"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onDragStart={(event) => event.preventDefault()}
      />
      <div className="split-pane-second">{second}</div>
    </div>
  )
}
