// How far an object's centre may move from the room centre along x and z so
// its rotated footprint stays inside the walls.
export function positionLimits(object, room) {
  const cos = Math.abs(Math.cos(object.rotation))
  const sin = Math.abs(Math.sin(object.rotation))
  const halfX = (cos * object.size.width + sin * object.size.depth) / 2
  const halfZ = (sin * object.size.width + cos * object.size.depth) / 2
  return {
    x: Math.max(0, room.width / 2 - halfX),
    z: Math.max(0, room.depth / 2 - halfZ),
  }
}
