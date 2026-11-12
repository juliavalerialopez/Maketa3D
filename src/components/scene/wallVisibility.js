// A wall hides when the camera is on its outer side, so the inside of the
// room stays visible. Each wall mesh (Walls.jsx) has userData.wallNormal,
// pointing out of the room. Used for the Plan view every frame, and for the
// camera of the Room render and the camera slot thumbnails.

export function showWallFor(mesh, camera) {
  // Seen from straight above (Plan's 2D view, J.1), no wall is in the way.
  if (camera.isOrthographicCamera) {
    mesh.visible = true
    return
  }
  const [nx, ny, nz] = mesh.userData.wallNormal
  const facing =
    (camera.position.x - mesh.position.x) * nx +
    (camera.position.y - mesh.position.y) * ny +
    (camera.position.z - mesh.position.z) * nz
  mesh.visible = facing <= 0
}

export function showWallsFor(scene, camera) {
  scene.traverse((object) => {
    if (object.userData.wallNormal) showWallFor(object, camera)
  })
}
