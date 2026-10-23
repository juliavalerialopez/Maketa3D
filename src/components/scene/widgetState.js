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
