import { Html } from '@react-three/drei'
import { meters } from './lengthText'

// How far inside the room the distances sit, in meters.
const LABEL_GAP = 0.35

// The distances along `wall` while a tool is on (J.7.1, J.8.1, J.8.2):
// from its start to `from`, and from `to` to its end (meters along it), as
// text inside the room next to each part; with `showWidth`, also from `from`
// to `to` between them. Clicks go through the text to the view.
export default function ToolDistances({ wall, from, to, showWidth = false }) {
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  const labels = [
    [from / 2, from],
    [(to + wall.length) / 2, wall.length - to],
  ]
  if (showWidth) labels.push([(from + to) / 2, to - from])
  return labels.map(([along, distance], side) => (
    <Html
      key={side}
      position={[wall.start.x + dx * along - nx * LABEL_GAP, 0, wall.start.z + dz * along - nz * LABEL_GAP]}
      center
      style={{ pointerEvents: 'none' }}
    >
      <div className={side === 2 ? 'wall-distance wall-distance-width' : 'wall-distance'}>{meters(distance)}</div>
    </Html>
  ))
}
