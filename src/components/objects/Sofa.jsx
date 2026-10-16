// Box-based sofa that fills its size bounds exactly. The back is at local -z,
// so an unrotated sofa faces +z. Proportions scale with size.
export default function Sofa({ position, rotation, size, color }) {
  const { width, depth, height } = size
  const armWidth = width * 0.075
  const armHeight = height * 0.75
  const backDepth = depth * 0.22
  const seatHeight = height * 0.5
  const innerWidth = width - 2 * armWidth

  const parts = [
    // Seat
    { position: [0, seatHeight / 2, backDepth / 2], size: [innerWidth, seatHeight, depth - backDepth] },
    // Back
    { position: [0, height / 2, -(depth - backDepth) / 2], size: [innerWidth, height, backDepth] },
    // Arms
    { position: [-(width - armWidth) / 2, armHeight / 2, 0], size: [armWidth, armHeight, depth] },
    { position: [(width - armWidth) / 2, armHeight / 2, 0], size: [armWidth, armHeight, depth] },
  ]

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {parts.map((part, index) => (
        <mesh key={index} position={part.position} castShadow receiveShadow>
          <boxGeometry args={part.size} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}
