// The widget's two controls (move and rotate), shared with the scene's own
// pointer handlers so a press on a widget handle never also drags or
// selects an object, or deselects.
export const widgetControls = { translate: null, rotate: null }

// True while a widget handle is hovered or being dragged.
export function isWidgetActive() {
  return Object.values(widgetControls).some(
    (controls) => controls && (controls.dragging || controls.axis !== null),
  )
}

// Objects under the pointer, by id (J0.2). The rotate ring's invisible handle
// can lie over an object's body; a press there should move the object, so the
// ring is paused while the pointer is over any object.
const hoveredObjects = new Set()

export function setObjectHovered(id, hovered) {
  if (hovered) hoveredObjects.add(id)
  else hoveredObjects.delete(id)
  updateRing()
}

// The ring takes presses only where nothing else should: not over an object,
// and not where a move arrow overlaps it (arrows win). A ring being dragged
// is left alone. A paused ring forgets its hovered handle, so isWidgetActive
// does not report it.
export function updateRing() {
  const { translate, rotate } = widgetControls
  if (!rotate || rotate.dragging) return
  rotate.enabled = hoveredObjects.size === 0 && (!translate || translate.axis === null)
  if (!rotate.enabled && rotate.axis !== null) rotate.axis = null
}
