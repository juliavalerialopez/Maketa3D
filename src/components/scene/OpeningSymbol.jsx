import { hingeOf, swingOf } from '../../store/openings'
import { FLOOR_COLOR, SELECTED_FILL } from './roomColors'
import { SYMBOL_Y, wallStrip } from './wallStrip'

// The flat plan symbols of doors and windows (J.8, J.9.5), drawn in Plan's 2D
// view and in the placing preview.
const LINE_COLOR = '#4a463f'
const WINDOW_FILL = '#eef3f5'
const LINE = 0.015

// The floor angle of world direction (x, z) for a flat ring (laid down by
// -90° about x, so local y is world -z).
const flatAngle = (x, z) => Math.atan2(-z, x)

function FlatBox({ box, color, opacity = 1 }) {
  return (
    <mesh position={box.position}>
      <boxGeometry args={box.size} />
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
    </mesh>
  )
}

// How strong a door's swing shows when `faint` (Plan's 2D view, J.9.5).
const FAINT_OPACITY = 0.4

// A door: a gap in the wall, the door leaf standing open and the arc it
// swings along, into the room or out of it (J.8.5). A window: a pale gap with
// two thin lines. `color` replaces the gap's own (a placing preview, J.8.1).
// The gap band starts `across` from the wall's inside line (a negative one
// reaches into the room), everything is `lift` higher (on top of the walls),
// and a door's swing is `faint` in Plan, so it does not fight the furniture.
export default function OpeningSymbol({ opening, wall, thickness, selected, color, across = 0, lift = 0, faint = false }) {
  const { offset, width } = opening
  const fill = color ?? (selected ? SELECTED_FILL : opening.type === 'door' ? FLOOR_COLOR : WINDOW_FILL)
  const gap = wallStrip(wall, offset, offset + width, across, thickness)
  if (opening.type === 'window') {
    return (
      <group position={[0, lift, 0]}>
        <FlatBox box={gap} color={fill} />
        <FlatBox box={wallStrip(wall, offset, offset + width, across + thickness * 0.3, LINE, SYMBOL_Y + 0.005)} color={LINE_COLOR} />
        <FlatBox box={wallStrip(wall, offset, offset + width, across + thickness * 0.7 - LINE, LINE, SYMBOL_Y + 0.005)} color={LINE_COLOR} />
      </group>
    )
  }
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  // Which way it opens: into the room (against the wall's outward side) or out.
  const sign = swingOf(opening) === 'out' ? 1 : -1
  const [ox, oz] = [sign * nx, sign * nz]
  // The hinge at one end of the door (J.8.6), on the wall's inside line; the
  // closed door lies from it along the wall.
  const atEnd = hingeOf(opening) === 'end'
  const hingeAt = atEnd ? offset + width : offset
  const hinge = [wall.start.x + dx * hingeAt, wall.start.z + dz * hingeAt]
  // The arc from the closed door to the open one, a quarter turn.
  const closed = atEnd ? flatAngle(-dx, -dz) : flatAngle(dx, dz)
  const open = flatAngle(ox, oz)
  const turn = Math.atan2(Math.sin(open - closed), Math.cos(open - closed))
  const thetaStart = turn > 0 ? closed : open
  const alongX = Math.abs(dz) < 1e-9
  const opacity = faint ? FAINT_OPACITY : 1
  return (
    <group position={[0, lift, 0]}>
      <FlatBox box={gap} color={fill} />
      <mesh position={[hinge[0], SYMBOL_Y + 0.005, hinge[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[width - LINE / 2, width + LINE / 2, 32, 1, thetaStart, Math.PI / 2]} />
        <meshBasicMaterial color={LINE_COLOR} transparent={faint} opacity={opacity} depthWrite={!faint} />
      </mesh>
      {/* The leaf, open. */}
      <mesh position={[hinge[0] + (ox * width) / 2, SYMBOL_Y + 0.005, hinge[1] + (oz * width) / 2]}>
        <boxGeometry args={alongX ? [LINE * 2, 0.01, width] : [width, 0.01, LINE * 2]} />
        <meshBasicMaterial color={LINE_COLOR} transparent={faint} opacity={opacity} depthWrite={!faint} />
      </mesh>
    </group>
  )
}
