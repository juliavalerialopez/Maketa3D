import { useEffect, useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { CAMERA_ID, useCameraStore } from '../../store/cameraStore'
import { useObjectsStore } from '../../store/objectsStore'
import { CAMERA_ROTATION_ORDER, RENDER_HEIGHT, RENDER_WIDTH } from '../../services/frame'
import { useUiStore } from '../../store/uiStore'
import { isWidgetActive } from './widgetState'
import { themeColor } from './themeColor'

// Pixels a press may move and still count as a click (as in Objects.jsx).
const CLICK_TOLERANCE = 2
// How far the view lines reach in front of the lens, in meters.
const VIEW_LINE_LENGTH = 0.6
// Dark grey body, the same in both themes like the floor and walls (the
// scene does not follow the theme; only helper lines do).
const BODY_COLOR = '#3a423d'
// The view lines are not clickable: lines are hit within a whole meter by
// default, which would catch clicks meant for furniture near the camera.
const noRaycast = () => null

// Lines from the lens to the corners of what the camera sees, and the outline
// of that rectangle, VIEW_LINE_LENGTH in front (the camera looks along -z).
function viewLines(fov) {
  const halfHeight = VIEW_LINE_LENGTH * Math.tan((fov * Math.PI) / 360)
  const halfWidth = (halfHeight * RENDER_WIDTH) / RENDER_HEIGHT
  const z = -VIEW_LINE_LENGTH
  const corners = [
    [-halfWidth, -halfHeight, z],
    [halfWidth, -halfHeight, z],
    [halfWidth, halfHeight, z],
    [-halfWidth, halfHeight, z],
  ]
  const points = corners.flatMap((corner, index) => [0, 0, 0, ...corner, ...corner, ...corners[(index + 1) % 4]])
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
  return geometry
}

// The placeable camera in Plan (I.14): a small camera body with lines showing
// what it sees. A helper: never in the Room render or the preview. Named
// CAMERA_ID so the widget can find it like an object. A click selects it.
export default function PlaceableCamera() {
  const { position, pan, tilt, fov } = useCameraStore((state) => state.camera)
  const lines = useMemo(() => viewLines(fov), [fov])
  useEffect(() => () => lines.dispose(), [lines])
  const lineColor = themeColor('--selection', useUiStore((state) => state.theme))

  function handleClick(event) {
    event.stopPropagation()
    // A press that moved was a drag; a press on a widget handle belongs to it.
    if (event.delta > CLICK_TOLERANCE || isWidgetActive()) return
    useObjectsStore.getState().selectObject(CAMERA_ID)
  }

  return (
    <group
      name={CAMERA_ID}
      position={position}
      rotation={[tilt, pan, 0, CAMERA_ROTATION_ORDER]}
      userData={{ helper: true }}
      onClick={handleClick}
    >
      <mesh position={[0, 0, 0.09]}>
        <boxGeometry args={[0.2, 0.14, 0.16]} />
        <meshStandardMaterial color={BODY_COLOR} />
      </mesh>
      <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.06, 16]} />
        <meshStandardMaterial color={BODY_COLOR} />
      </mesh>
      <lineSegments geometry={lines} raycast={noRaycast}>
        <lineBasicMaterial color={lineColor} />
      </lineSegments>
    </group>
  )
}
