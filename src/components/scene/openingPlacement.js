// Where a door or window sits in 3D (J.8, J.9.1): the middle of its rectangle
// `inFront` meters in front of its wall's inside face, and the turn about y
// that makes a plane (facing +z) face into the room. `wall` is its roomWalls
// entry. Plain JS, no React.
export function openingPlacement(wall, opening, inFront) {
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  const middle = opening.offset + opening.width / 2
  return {
    position: [
      wall.start.x + dx * middle - nx * inFront,
      opening.sill + opening.height / 2,
      wall.start.z + dz * middle - nz * inFront,
    ],
    turn: Math.atan2(-nx, -nz),
  }
}
