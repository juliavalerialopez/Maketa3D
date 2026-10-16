import { useRoomStore } from '../store/roomStore'

export default function Floor() {
  const width = useRoomStore((state) => state.room.width)
  const depth = useRoomStore((state) => state.room.depth)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  )
}
