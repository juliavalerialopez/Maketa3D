// Draws an object model from a list of primitive parts, all in the object's
// color unless a part sets its own. Each part:
//   { position: [x, y, z], box: [width, height, depth] }
//   { position: [x, y, z], cylinder: [radiusTop, radiusBottom, height] }
// plus an optional `color`. Positions are part centres, relative to the
// object's origin (the middle of its base).
const CYLINDER_SEGMENTS = 32

export default function Parts({ parts, color }) {
  return (
    <>
      {parts.map((part, index) => (
        <mesh key={index} position={part.position} castShadow receiveShadow>
          {part.box ? (
            <boxGeometry args={part.box} />
          ) : (
            <cylinderGeometry args={[...part.cylinder, CYLINDER_SEGMENTS]} />
          )}
          <meshStandardMaterial color={part.color ?? color} />
        </mesh>
      ))}
    </>
  )
}
