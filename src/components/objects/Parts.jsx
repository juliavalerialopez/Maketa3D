// Draws an object model from a list of primitive parts, all in the object's
// color unless a part sets its own. Each part:
//   { position: [x, y, z], box: [width, height, depth] }
//   { position: [x, y, z], cylinder: [radiusTop, radiusBottom, height] }
// plus an optional `color`. Positions are part centres, relative to the
// object's origin (the middle of its base). `faded` draws every part see-
// through (a hidden object in Plan, H.6.2).
const CYLINDER_SEGMENTS = 32
const FADED_OPACITY = 0.3

export default function Parts({ parts, color, faded = false }) {
  return (
    <>
      {parts.map((part, index) => (
        <mesh key={index} position={part.position} castShadow={!faded} receiveShadow>
          {part.box ? (
            <boxGeometry args={part.box} />
          ) : (
            <cylinderGeometry args={[...part.cylinder, CYLINDER_SEGMENTS]} />
          )}
          {/* New material when fading changes: three.js may not apply a
              changed `transparent` to an existing one. */}
          <meshStandardMaterial
            key={faded ? 'faded' : 'solid'}
            color={part.color ?? color}
            transparent={faded}
            opacity={faded ? FADED_OPACITY : 1}
            depthWrite={!faded}
          />
        </mesh>
      ))}
    </>
  )
}
