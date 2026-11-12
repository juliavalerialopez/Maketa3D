import { useState } from 'react'
import { ROOM_LIMITS, useRoomStore } from '../../store/roomStore'
import { MIN_WALL, findWall, roomWalls } from '../../store/roomShape'
import { useUiStore } from '../../store/uiStore'
import { editGesture } from '../../store/historyStore'
import NumberField from '../ui/NumberField'

// A wall's inside length in Build (J.5), next to the wall and in the Wall
// section (J.7). Typing a length (or stepping it) moves the wall's end
// farther from the origin. It is applied only once final (blur, a step, the
// end of a drag), since a length in between may not make a room; a length
// that would break the room (a wall under 0.5 m, crossing walls, a room too
// big or too small) is refused and the field shows the length again.
// `wall` is the roomWalls entry, `index` its number.
export default function WallLengthField({ index, wall, compact = false }) {
  // The length being typed or stepped, until it is final; null otherwise.
  const [typed, setTyped] = useState(null)
  const [refusals, setRefusals] = useState(0)

  function commit(length) {
    setTyped(null)
    if (Math.abs(length - wall.length) < 1e-9) return
    // The selected wall (J.7) may lose a corner's old place: it is selected
    // again by its number, which a new length does not change.
    const { selectedWall, selectWall } = useUiStore.getState()
    const before = useRoomStore.getState().room.corners
    const selected = selectedWall ? findWall(before, selectedWall.a, selectedWall.b) : -1
    if (!useRoomStore.getState().setWallLength(index, length)) {
      setRefusals((count) => count + 1)
      return
    }
    if (selected === -1) return
    const moved = roomWalls(useRoomStore.getState().room.corners)[selected]
    selectWall({ a: { ...moved.start }, b: { ...moved.end } })
  }

  return (
    // Remounted after a refusal, so it shows the stored length again.
    <NumberField
      key={refusals}
      compact={compact}
      label={compact ? `Wall ${index + 1}` : 'Length'}
      value={typed ?? wall.length}
      onChange={setTyped}
      onCommit={commit}
      {...editGesture}
      min={MIN_WALL}
      max={ROOM_LIMITS.width[1]}
      unit="m"
    />
  )
}
