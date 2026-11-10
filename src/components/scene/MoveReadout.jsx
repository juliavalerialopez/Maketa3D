import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useObjectsStore } from '../../store/objectsStore'
import { useUiStore } from '../../store/uiStore'
import { MIN_MOVE, arrowFor, movedText } from './moveText'

// How far above the object's top the label floats, in meters.
const LIFT = 0.25

const here = new Vector3()
const there = new Vector3()

// While an object is being moved, a small label above it shows how far it
// has moved since the press, one number per room axis it moved along, each
// with an arrow for the way it went on screen (J0.3.1), e.g. "→ 30 cm". It is
// HTML over the canvas, so it never shows in a Room render.
export default function MoveReadout() {
  const moving = useUiStore((state) => state.moving)
  const object = useObjectsStore((state) => state.objects.find((item) => item.id === moving?.id))
  const camera = useThree((state) => state.camera)
  if (!object) return null

  const [x, , z] = object.position
  // The screen direction of a step along one world axis from the object.
  const arrow = (dx, dz) => {
    here.set(x, 0, z).project(camera)
    there.set(x + dx, 0, z + dz).project(camera)
    return arrowFor(there.x - here.x, there.y - here.y)
  }
  const movedX = x - moving.start[0]
  const movedZ = z - moving.start[1]
  const parts = []
  if (Math.abs(movedX) >= MIN_MOVE) parts.push(`${arrow(Math.sign(movedX), 0)} ${movedText(movedX)}`)
  if (Math.abs(movedZ) >= MIN_MOVE) parts.push(`${arrow(0, Math.sign(movedZ))} ${movedText(movedZ)}`)

  return (
    <Html position={[x, object.size.height + LIFT, z]} center style={{ pointerEvents: 'none' }}>
      {/* An em space between the two numbers (plain spaces would collapse). */}
      <div className="move-readout">{parts.length ? parts.join(' ') : '0 cm'}</div>
    </Html>
  )
}
