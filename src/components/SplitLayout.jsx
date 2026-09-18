import { useCallback, useEffect, useRef, useState } from 'react'
import ControlPanel from './ControlPanel'

const MIN_PANEL_PERCENT = 15
const MAX_PANEL_PERCENT = 50

export default function SplitLayout({ children }) {
  const [panelPercent, setPanelPercent] = useState(20)
  const draggingRef = useRef(false)

  const handleMouseDown = useCallback(() => {
    draggingRef.current = true
  }, [])

  useEffect(() => {
    function handleMouseMove(event) {
      if (!draggingRef.current) return
      const percent = (event.clientX / window.innerWidth) * 100
      const clamped = Math.min(MAX_PANEL_PERCENT, Math.max(MIN_PANEL_PERCENT, percent))
      setPanelPercent(clamped)
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
    <div className="split-layout">
      <div style={{ width: `${panelPercent}%` }}>
        <ControlPanel />
      </div>
      <div className="divider" onMouseDown={handleMouseDown} />
      <div className="scene-pane">{children}</div>
    </div>
  )
}
