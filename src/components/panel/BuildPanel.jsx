import { useRoomStore } from '../../store/roomStore'
import { useUiStore } from '../../store/uiStore'
import { MIN_CUT_WALL, findWall, roomWalls } from '../../store/roomShape'
import Section from './Section'
import RoomInputs from './RoomInputs'
import WallLengthField from './WallLengthField'
import OpeningsSection from './OpeningsSection'
import Button from '../ui/Button'

const SCISSORS_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M8.1 8.1L20 20M8.1 15.9L20 4" />
  </svg>
)

// The selected wall's details (J.7): its length and the Cut button. Cut
// waits for a click on the wall, where the piece is cut out; Esc or a second
// press cancels it.
function WallDetails({ index, wall }) {
  const cutting = useUiStore((state) => state.cutting)
  const setCutting = useUiStore((state) => state.setCutting)
  const canCut = wall.length >= MIN_CUT_WALL - 1e-9

  return (
    <div className="field-stack">
      <WallLengthField key={index} index={index} wall={wall} />
      <Button onClick={() => setCutting(!cutting)} disabled={!canCut} pressed={cutting}>
        {SCISSORS_ICON}
        Cut
      </Button>
      {cutting && <p className="panel-notice">Click on the wall where the piece should be cut out. Esc cancels.</p>}
      {!canCut && <p className="panel-notice">A wall shorter than 1.5 m can't be cut.</p>}
    </div>
  )
}

// Build's control panel (J.5, J.7, J.8): Room configuration (shape buttons
// and Height), with a wall selected that wall's details, and the doors and
// windows.
export default function BuildPanel() {
  const corners = useRoomStore((state) => state.room.corners)
  const selected = useUiStore((state) => state.selectedWall)
  const index = selected ? findWall(corners, selected.a, selected.b) : -1

  return (
    <div className="control-panel">
      <Section id="room" title="Room configuration">
        <RoomInputs inBuild />
      </Section>
      {index !== -1 && (
        <Section key={index} id="wall" title={`Wall ${index + 1}`}>
          <WallDetails index={index} wall={roomWalls(corners)[index]} />
        </Section>
      )}
      <Section id="openings" title="Openings">
        <OpeningsSection />
      </Section>
    </div>
  )
}
