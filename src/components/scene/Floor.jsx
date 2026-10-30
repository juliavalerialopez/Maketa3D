import { useRoomStore } from '../../store/roomStore'

// Warm sand from the soft UI palette. The same in both themes, so the Room
// render sent to the AI does not depend on the theme.
const FLOOR_COLOR = '#d9d1bb'

export default function Floor() {
  const width = useRoomStore((state) => state.room.width)
  const depth = useRoomStore((state) => state.room.depth)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={FLOOR_COLOR} />
    </mesh>
  )
}
