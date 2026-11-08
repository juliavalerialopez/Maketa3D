import { widgetControls } from './widgetState'
import { showWallsFor } from './wallVisibility'
import { useObjectsStore } from '../../store/objectsStore'

// Prepares the scene to be drawn as the Room render (or a camera slot's
// thumbnail) from `camera`: hides helpers (objects with userData.helper, such
// as the selection box), the widget and hidden objects (H.6.2), and hides the
// walls facing that camera. Returns a function that puts everything back for
// the Plan view's `planCamera`. The capture draws and restores in one call,
// so the page never shows the scene prepared this way.
export function prepareRoomRender(scene, camera, planCamera) {
  const hidden = []
  const hide = (object) => {
    if (!object?.visible) return
    object.visible = false
    hidden.push(object)
  }
  scene.traverse((object) => {
    if (object.userData.helper) hide(object)
  })
  Object.values(widgetControls).forEach(hide)
  useObjectsStore
    .getState()
    .objects.filter((object) => object.hidden)
    .forEach((object) => hide(scene.getObjectByName(object.id)))
  showWallsFor(scene, camera)

  return () => {
    hidden.forEach((object) => (object.visible = true))
    showWallsFor(scene, planCamera)
  }
}
