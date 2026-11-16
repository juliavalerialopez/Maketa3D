import { Mesh } from 'three'

// A raycast for a mesh inside a group that hides with its wall (the group is
// its parent): hidden, it is not hit at all, so a click through it on empty
// space still lets the selection go. Set as the mesh's `raycast` prop.
export function raycastWhenShown(raycaster, intersects) {
  if (this.parent?.visible) Mesh.prototype.raycast.call(this, raycaster, intersects)
}
