import IconButton from '../ui/IconButton'
import Thumbnail from '../ui/Thumbnail'
import { currentView, takeThumbnail } from './snapshot'
import { slotName, useCameraSlotsStore } from '../../store/cameraSlotsStore'
import { useModeStore } from '../../store/modeStore'

const UpdateIcon = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3" />
  </svg>
)

const Plus = (
  <span className="camera-slot-plus" aria-hidden="true">
    +
  </span>
)

// Saves what the frame guide shows now into a slot, with its thumbnail.
// Nothing happens if the Plan scene cannot render (e.g. context lost).
function saveCurrentView(index) {
  const view = currentView()
  const thumbnail = view && takeThumbnail(view)
  if (thumbnail) useCameraSlotsStore.getState().saveSlot(index, { view, thumbnail })
}

function jumpTo(index) {
  const { slots, setActiveSlot } = useCameraSlotsStore.getState()
  useModeStore.getState().goToPlanView(slots[index].view)
  setActiveSlot(index)
}

// One camera slot (I.14.1), a large shared Thumbnail. Empty: a big plus; a
// click saves the current view. Filled: its thumbnail; a click moves the Plan
// view to it, the update icon (top left) saves the current view over it, and
// the X (top right, shown on hover or focus) empties it.
function CameraSlot({ index, slot, active }) {
  const name = slotName(index)
  return (
    <div className="camera-slot">
      {slot ? (
        <Thumbnail
          size="large"
          src={slot.thumbnail}
          selected={active}
          label={`Go to ${name}`}
          onSelect={() => jumpTo(index)}
          onDelete={() => useCameraSlotsStore.getState().clearSlot(index)}
          deleteLabel={`Remove ${name}`}
          deleteCorner="right"
          action={
            <IconButton label={`Update ${name} to this view`} size="small" onClick={() => saveCurrentView(index)}>
              {UpdateIcon}
            </IconButton>
          }
        />
      ) : (
        <Thumbnail
          size="large"
          placeholder={Plus}
          label={`Save this view as ${name}`}
          onSelect={() => saveCurrentView(index)}
        />
      )}
      <span className="camera-slot-name">{name}</span>
    </div>
  )
}

// The row of camera slots along the bottom of the Plan scene (I.14.1). Plain
// HTML above the canvas, like the frame guide; never part of a WebGL render.
export default function CameraSlots() {
  const slots = useCameraSlotsStore((state) => state.slots)
  const activeSlot = useCameraSlotsStore((state) => state.activeSlot)

  return (
    <div className="camera-slots" role="group" aria-label="Camera slots">
      {slots.map((slot, index) => (
        <CameraSlot key={index} index={index} slot={slot} active={index === activeSlot} />
      ))}
    </div>
  )
}
