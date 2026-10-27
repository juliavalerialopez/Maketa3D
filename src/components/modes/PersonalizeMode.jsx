import { useEffect, useRef, useState } from 'react'
import SplitLayout from '../layout/SplitLayout'
import PersonalizePanel from '../panel/PersonalizePanel'
import { useModeStore } from '../../store/modeStore'
import { useUiStore } from '../../store/uiStore'

// Space between the two images, in pixels (also used by .render-row).
const GAP = 8
// Divider limits for the top part, in percent: the panel stays 15–50%.
const MIN_TOP = 50
const MAX_TOP = 85

// Top-part height (percent) at which two 16:9 images, each half the width,
// fill it exactly: no space above or below them.
function fitPercent({ width, height }) {
  if (!width || !height) return 60
  const imageHeight = (((width - GAP) / 2) * 9) / 16
  return Math.min(MAX_TOP, Math.max(MIN_TOP, (imageHeight / height) * 100))
}

// One 16:9 image slot. The caption sits over the image, top center, as a
// page guide only: it is never part of the image.
function RenderSlot({ caption, children }) {
  return (
    <figure className="render-slot">
      {children}
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

// Personalize mode: Room render and the (empty) AI image side by side on top,
// control panel below. Until the divider is dragged, the top part follows the
// window so the images fill it exactly; a dragged position is kept in uiStore.
export default function PersonalizeMode() {
  const snapshot = useModeStore((state) => state.snapshot)
  const personalizePercent = useUiStore((state) => state.personalizePercent)
  const setPersonalizePercent = useUiStore((state) => state.setPersonalizePercent)
  const containerRef = useRef(null)
  // Measured size of this mode's area: layout only, not app state.
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = containerRef.current
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="mode-fill" ref={containerRef}>
      <SplitLayout
        vertical
        first={
          <div className="render-row" style={{ '--render-gap': `${GAP}px` }}>
            <RenderSlot caption="Room render">
              {snapshot ? <img src={snapshot} alt="Room render" /> : 'No render'}
            </RenderSlot>
            <RenderSlot caption="AI image" />
          </div>
        }
        second={<PersonalizePanel />}
        percent={personalizePercent ?? fitPercent(size)}
        onPercentChange={setPersonalizePercent}
        min={MIN_TOP}
        max={MAX_TOP}
      />
    </div>
  )
}
