import { useEffect, useRef, useState } from 'react'
import SplitLayout from '../layout/SplitLayout'
import PersonalizePanel from '../panel/PersonalizePanel'
import Thumbnail from '../ui/Thumbnail'
import MenuButton from '../ui/MenuButton'
import { useModeStore } from '../../store/modeStore'
import { selectSelectedVersion, useRestyleStore } from '../../store/restyleStore'
import { useUiStore } from '../../store/uiStore'

// Space between the two images, in pixels (also used by .render-row).
const GAP = 8
// Height of the versions strip under the images, and the space above it, in
// pixels (also used by .render-row as --strip-height and --strip-gap).
const STRIP_HEIGHT = 52
const STRIP_GAP = 8
// Divider limits for the top part, in percent: the panel stays 15–50%.
const MIN_TOP = 50
const MAX_TOP = 85

// Top-part height (percent) at which two 16:9 images, each half the width,
// plus the versions strip below them, fill it exactly.
function fitPercent({ width, height }) {
  if (!width || !height) return 60
  const imageHeight = (((width - GAP) / 2) * 9) / 16
  const topHeight = imageHeight + STRIP_GAP + STRIP_HEIGHT
  return Math.min(MAX_TOP, Math.max(MIN_TOP, (topHeight / height) * 100))
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

const DownloadIcon = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" />
  </svg>
)

// The AI image: the selected version, black when none, with a download
// menu at its top right (this image, or all versions in a ZIP). While
// generating, the shown version (if any) stays, dimmed, with a small label.
function AiImage({ version }) {
  const loading = useRestyleStore((state) => state.status === 'loading')
  const versionCount = useRestyleStore((state) => state.versions.length)
  const downloadVersion = useRestyleStore((state) => state.downloadVersion)
  const downloadAllVersions = useRestyleStore((state) => state.downloadAllVersions)

  if (!version) return loading ? 'Generating…' : null
  return (
    <>
      <img
        src={version.image}
        alt={`AI image, version ${version.number}`}
        className={loading ? 'dimmed' : undefined}
      />
      {loading && <span className="render-slot-status">Generating…</span>}
      <MenuButton
        label="Download"
        icon={DownloadIcon}
        className="render-slot-download"
        items={[
          { label: 'Download this image', onSelect: () => downloadVersion(version.id) },
          { label: `Download all (${versionCount}) as ZIP`, onSelect: downloadAllVersions },
        ]}
      />
    </>
  )
}

// Thumbnails of the versions, oldest first, under the AI image. Click one to
// show it; its X deletes it.
function VersionStrip() {
  const versions = useRestyleStore((state) => state.versions)
  const selectedVersionId = useRestyleStore((state) => state.selectedVersionId)
  const selectVersion = useRestyleStore((state) => state.selectVersion)
  const deleteVersion = useRestyleStore((state) => state.deleteVersion)

  return (
    <div className="version-strip" role="group" aria-label="AI versions">
      {versions.map((version) => (
        <Thumbnail
          key={version.id}
          src={version.image}
          alt={`Version ${version.number}`}
          selected={version.id === selectedVersionId}
          onSelect={() => selectVersion(version.id)}
          onDelete={() => deleteVersion(version.id)}
          deleteLabel={`Delete version ${version.number}`}
        />
      ))}
    </div>
  )
}

// Personalize mode: Room render and the AI image side by side on top, the
// versions strip under the AI image, control panel below. Until the divider
// is dragged, the top part follows the window so it fits exactly; a dragged
// position is kept in uiStore.
export default function PersonalizeMode() {
  // The current Room render's image (modeStore.roomRender is an object).
  const snapshot = useModeStore((state) => state.roomRender?.image ?? null)
  const version = useRestyleStore(selectSelectedVersion)
  // The top two images always match: a version shows its own Room render.
  const roomRender = version ? version.roomRender : snapshot
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

  const rowStyle = {
    '--render-gap': `${GAP}px`,
    '--strip-height': `${STRIP_HEIGHT}px`,
    '--strip-gap': `${STRIP_GAP}px`,
  }

  return (
    <div className="mode-fill" ref={containerRef}>
      <SplitLayout
        vertical
        first={
          <div className="render-row" style={rowStyle}>
            <div className="render-column">
              <RenderSlot caption="Room render">
                {roomRender ? <img src={roomRender} alt="Room render" /> : 'No render'}
              </RenderSlot>
              {/* Same height as the strip, so both images stay aligned. */}
              <div className="version-strip-spacer" />
            </div>
            <div className="render-column">
              <RenderSlot caption="AI image">
                <AiImage version={version} />
              </RenderSlot>
              <VersionStrip />
            </div>
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
