import { Html } from '@react-three/drei'
import { useObjectsStore } from '../../store/objectsStore'
import { useUiStore } from '../../store/uiStore'

// Same rounding as the number fields, so the label and Object details agree.
const shown = (meters) => String(Math.round(meters * 1000) / 1000)

// How far above the object's top the label floats, in meters.
const LIFT = 0.25

// While an object is being moved, a small label above it shows its new
// position, the same X and Z as Location in Object details (J0.3). It is HTML
// over the canvas, so it never shows in a Room render.
export default function MoveReadout() {
  const movingId = useUiStore((state) => state.movingId)
  const object = useObjectsStore((state) => state.objects.find((item) => item.id === movingId))
  if (!object) return null

  const [x, , z] = object.position
  return (
    <Html position={[x, object.size.height + LIFT, z]} center style={{ pointerEvents: 'none' }}>
      <div className="move-readout">
        X {shown(x)} · Z {shown(z)} m
      </div>
    </Html>
  )
}
