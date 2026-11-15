import { Html } from '@react-three/drei'
import { MIN_CUT_WALL } from '../../store/roomShape'
import { OPENING_TYPES } from '../../store/openings'
import { useUiStore } from '../../store/uiStore'
import Button from '../ui/Button'

// How far inside the room the bar sits from the wall's middle, in meters.
const BAR_GAP = 0.6

// The bar's own presses and moves stay on it: they would otherwise reach the
// view under it (and select, drag, pan or let go of what is there). The
// wheel still zooms.
const keep = (event) => event.stopPropagation()

function start(tool) {
  const ui = useUiStore.getState()
  ui.setBuildNotice(null)
  ui.setTool(tool)
}

// The selected wall's options in Build (J.8.3): a small bar inside the room
// at the wall's middle, with Cut, Door and Window. Each starts the same tool
// as its button in Wall tools. Cut is off on a wall too short to cut.
export default function WallBar({ wall }) {
  const [mx, mz] = [(wall.start.x + wall.end.x) / 2, (wall.start.z + wall.end.z) / 2]
  const [nx, nz] = wall.normal
  return (
    <Html position={[mx - nx * BAR_GAP, 0, mz - nz * BAR_GAP]} center>
      <div
        className="wall-bar"
        onPointerDown={keep}
        onPointerMove={keep}
        onPointerUp={keep}
        onClick={keep}
      >
        <Button onClick={() => start('cut')} disabled={wall.length < MIN_CUT_WALL - 1e-9}>
          Cut
        </Button>
        <Button onClick={() => start('door')}>{OPENING_TYPES.door.label}</Button>
        <Button onClick={() => start('window')}>{OPENING_TYPES.window.label}</Button>
      </div>
    </Html>
  )
}
