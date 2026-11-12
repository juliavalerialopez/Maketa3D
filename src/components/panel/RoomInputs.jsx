import { useEffect, useState } from 'react'
import { ROOM_LIMITS, notchLimits, roomParams, useRoomStore } from '../../store/roomStore'
import { useObjectsStore } from '../../store/objectsStore'
import { beginGesture, editGesture, endGesture } from '../../store/historyStore'
import NumberField from '../ui/NumberField'
import SegmentedSwitch from '../ui/SegmentedSwitch'
import IconButton from '../ui/IconButton'

// How long the "moved inside" notice stays, in seconds.
const NOTICE_SECONDS = 5

const icon = (children) => (
  <svg className="room-shape-icon" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)

// The shape buttons (J.4). Build opens the Build tab, from J.5.
const SHAPES = [
  { value: 'square', title: 'Square', label: icon(<rect x="4" y="4" width="16" height="16" rx="1" />) },
  { value: 'rectangle', title: 'Rectangle', label: icon(<rect x="2" y="6" width="20" height="12" rx="1" />) },
  // The cut away corner at the front right, as a new L starts.
  { value: 'l', title: 'L shape', label: icon(<path d="M4 4h16v9h-7v7H4z" />) },
  {
    value: 'build',
    title: 'Build (coming soon)',
    disabled: true,
    label: icon(<path d="M15 4l5 5L9 20H4v-5z" />),
  },
]

const ROTATE_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" />
  </svg>
)

// The fields per shape: [key, label, limits]. A Square's side is its width.
const FIELDS = {
  square: [['width', 'Side', ROOM_LIMITS.width]],
  rectangle: [
    ['width', 'Width', ROOM_LIMITS.width],
    ['depth', 'Depth', ROOM_LIMITS.depth],
  ],
  l: [
    ['width', 'Width', ROOM_LIMITS.width],
    ['depth', 'Depth', ROOM_LIMITS.depth],
    ['notchWidth', 'Notch width'],
    ['notchDepth', 'Notch depth'],
  ],
  // Shown, not editable: the bounding box of a room shaped in Build.
  custom: [
    ['width', 'Width'],
    ['depth', 'Depth'],
  ],
}

function messageFor(moved) {
  if (!moved) return null
  return moved === 1 ? '1 object was moved inside the room.' : `${moved} objects were moved inside the room.`
}

// Room configuration (Plan): the shape buttons and the sizes of that shape
// (J.4). Objects move inside the walls once a size is final (I.1), never
// while typing, and right after a new shape or a turned notch; after a shape
// change a short notice says how many moved. A shape change and the moves it
// causes are one undo step.
export default function RoomInputs() {
  const room = useRoomStore((state) => state.room)
  const { setRoomSize, setShape, rotateNotch } = useRoomStore.getState()
  const [notice, setNotice] = useState(null)
  const params = roomParams(room)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), NOTICE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  // The store already has the committed size here. Returns how many moved.
  const fitObjects = () => useObjectsStore.getState().fitToRoom(useRoomStore.getState().room)

  // A change of the whole room (shape, notch corner) and the objects it
  // pushes inside, as one undo step, with the notice.
  function changeRoom(change) {
    beginGesture()
    change()
    const moved = fitObjects()
    endGesture()
    setNotice(messageFor(moved))
  }

  const limitsFor = (key, limits) => {
    if (limits) return limits
    if (key === 'notchWidth') return notchLimits(params.width)
    if (key === 'notchDepth') return notchLimits(params.depth)
    return []
  }

  return (
    <div className="field-stack">
      <div className="room-shapes">
        <SegmentedSwitch
          options={SHAPES}
          value={params.shape}
          onChange={(shape) => changeRoom(() => setShape(shape))}
          label="Room shape"
          size="small"
          stretch
        />
        {params.shape === 'l' && (
          <IconButton label="Turn the L (move the cut away corner)" size="small" onClick={() => changeRoom(rotateNotch)}>
            {ROTATE_ICON}
          </IconButton>
        )}
      </div>
      {params.shape === 'custom' && <p className="panel-notice">Custom shape. Edit it in Build.</p>}
      {[...FIELDS[params.shape], ['height', 'Height', ROOM_LIMITS.height]].map(([key, label, limits]) => {
        const [min, max] = limitsFor(key, limits)
        return (
          <NumberField
            key={`${params.shape}-${key}`}
            label={label}
            value={params[key]}
            onChange={(value) => setRoomSize({ [key]: value })}
            onCommit={fitObjects}
            {...editGesture}
            min={min}
            max={max}
            unit="m"
            disabled={params.shape === 'custom' && key !== 'height'}
          />
        )
      })}
      {notice && (
        <p className="panel-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
