import { useModeStore } from '../../store/modeStore'
import { useRestyleStore } from '../../store/restyleStore'
import { useCameraSlotsStore } from '../../store/cameraSlotsStore'
import { useUiStore } from '../../store/uiStore'
import { captureSlot, takeSnapshot } from '../scene/snapshot'

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

// Switches to mode `next` ('plan' or 'personalize'). Switching to Personalize
// unmounts the Plan canvas, so the Room renders are taken first, while the
// canvas is still there (null for a render that fails). New renders start with
// no versions, so the two images always match.
export function switchMode(next) {
  const { mode, setMode } = useModeStore.getState()
  if (next === mode) return
  // A placing tool (J.9.4) or Cut does not carry over to another mode, nor
  // does a selected wall or opening.
  const ui = useUiStore.getState()
  ui.setTool(null)
  ui.selectWall(null)
  ui.selectOpening(null)
  if (next === 'personalize') {
    takeRoomRenders()
    useRestyleStore.getState().clearVersions()
  }
  setMode(next)
}
