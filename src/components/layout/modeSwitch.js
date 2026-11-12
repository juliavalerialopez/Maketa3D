import { useModeStore } from '../../store/modeStore'
import { useRoomStore } from '../../store/roomStore'
import { useObjectsStore } from '../../store/objectsStore'
import { useRestyleStore } from '../../store/restyleStore'
import { useCameraSlotsStore } from '../../store/cameraSlotsStore'
import { movedInsideNotice, useUiStore } from '../../store/uiStore'
import { beginGesture, endGesture } from '../../store/historyStore'
import { cancelPlanCanvasWait, captureSlot, takeSnapshot, whenPlanCanvasReady } from '../scene/snapshot'

// The Room render of every filled camera slot (I.14.2). With all slots empty,
// the current Plan view goes into slot 1 first (and becomes active).
function takeRoomRenders() {
  const cameraSlots = useCameraSlotsStore.getState()
  if (cameraSlots.slots.every((slot) => !slot)) {
    const slot = captureSlot()
    if (slot) cameraSlots.saveSlot(0, slot)
  }
  const { slots, activeSlot } = useCameraSlotsStore.getState()
  const renders = slots.map((slot) => (slot ? takeSnapshot(slot.view) : null))
  useModeStore.getState().setRoomRenders(renders, activeSlot)
}

// Leaving Build (J.5): pieces left outside the reshaped room move inside, as
// an undo step of their own, and Room configuration says how many (when it
// shows next, in Plan).
function leaveBuild(showNotice) {
  const ui = useUiStore.getState()
  ui.selectWall(null)
  ui.selectOpening(null)
  ui.setBuildNotice(null)
  beginGesture()
  const moved = useObjectsStore.getState().fitToRoom(useRoomStore.getState().room)
  endGesture()
  useUiStore.getState().setRoomNotice(showNotice ? movedInsideNotice(moved) : null)
}

// Switches to mode `next` ('build', 'plan' or 'personalize'). Switching to
// Personalize unmounts the Plan canvas, so the Room renders are taken first,
// while the canvas is still there (null for a render that fails). New
// renders start with no versions, so the two images always match. From Build,
// Personalize passes through Plan: the renders need Plan's canvas, so Plan
// opens, and Personalize follows once that canvas is ready.
export function switchMode(next) {
  const { mode, setMode } = useModeStore.getState()
  if (next === mode) return
  // A switch still waiting for the Plan canvas is dropped: this one wins.
  cancelPlanCanvasWait()
  if (mode === 'build') leaveBuild(next === 'plan')
  if (next === 'personalize' && mode === 'build') {
    setMode('plan')
    whenPlanCanvasReady(() => {
      if (useModeStore.getState().mode === 'plan') switchMode('personalize')
    })
    return
  }
  if (next === 'personalize') {
    takeRoomRenders()
    useRestyleStore.getState().clearVersions()
  }
  setMode(next)
}
