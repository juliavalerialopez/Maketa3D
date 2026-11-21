import { useEffect, useId, useState } from 'react'
import { linkedRoom, reshapedRoom, resizedRoom, roomParams, rotatedNotch, useRoomStore, wallsChangedBy } from '../../store/roomStore'
import { useObjectsStore } from '../../store/objectsStore'
import { movedInsideNotice, useUiStore } from '../../store/uiStore'
import { tallestOpening } from '../../store/openings'
import { limitsFor, openingsFit } from '../../store/roomMeasure'
import { beginGesture, endGesture } from '../../store/historyStore'
import { switchMode } from '../layout/modeSwitch'
import MeasureField from '../ui/MeasureField'
import ShapeCards from './ShapeCards'
import IconButton from '../ui/IconButton'
import Toggle from '../ui/Toggle'

// How long the "moved inside" notice stays, in seconds.
const NOTICE_SECONDS = 5

const ROTATE_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" />
  </svg>
)

// The fields per shape: [key, label].
const FIELDS = {
  standard: [
    ['width', 'Width'],
    ['depth', 'Depth'],
  ],
  l: [
    ['width', 'Width'],
    ['depth', 'Depth'],
    ['notchWidth', 'Notch width'],
    ['notchDepth', 'Notch depth'],
  ],
  // Shown, not editable: the bounding box of a room shaped in Build.
  custom: [
    ['width', 'Width'],
    ['depth', 'Depth'],
  ],
}

// Room configuration: the shape buttons and the sizes of that shape (J.4,
// K.1.5). A size is typed as text and applied when it is final (Enter, blur, an
// arrow key, a step button); one that is not a number, is outside its limits or
// would leave a door or window not fitting its wall is refused, and the message
// shows under the fields. In Plan, objects move inside the walls once a size is
// final (I.1), and right after a new shape or a turned notch; after a shape
// change a short notice says how many moved. A shape change and the moves it
// causes are one undo step. In Build (`inBuild`, J.5) the same buttons and
// sizes show (J.5.4); objects are not moved there but when Build closes.
export default function RoomInputs({ inBuild = false }) {
  const room = useRoomStore((state) => state.room)
  const notice = useUiStore((state) => state.roomNotice)
  const params = roomParams(room)
  // The last refused value: { key, message } (key is the field, or null for a
  // change of the whole room), or null.
  const [problem, setProblem] = useState(null)
  const problemId = useId()

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => useUiStore.getState().setRoomNotice(null), NOTICE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  // Highlights the walls field `key` changes, or for Height their top edge,
  // or nothing (J.4.2).
  const highlight = (key) =>
    useUiStore
      .getState()
      .setHighlight(key ? wallsChangedBy(useRoomStore.getState().room, key) : [], key === 'height')

  // Gone with the panel (a mode switch): no highlight is left behind.
  useEffect(() => () => useUiStore.getState().setHighlight([]), [])

  // The store already has the committed size here. Returns how many moved.
  const fitObjects = () => (inBuild ? 0 : useObjectsStore.getState().fitToRoom(useRoomStore.getState().room))

  // A change of the whole room (shape, notch corner, link): refused with a
  // message when a door or window would not fit; otherwise applied with the
  // objects it pushes inside as one undo step, and the notice.
  function changeRoom(change) {
    const current = useRoomStore.getState().room
    const next = change(current)
    if (next === current) return
    const fit = openingsFit(current, next)
    if (!fit.ok) {
      setProblem({ key: null, message: fit.message })
      return
    }
    setProblem(null)
    beginGesture()
    useRoomStore.getState().setRoom(next)
    const moved = fitObjects()
    endGesture()
    useUiStore.getState().setRoomNotice(movedInsideNotice(moved))
  }

  // Custom opens Build (where the walls are shaped); in Build it is already
  // there.
  function chooseShape(shape) {
    if (shape === 'custom') {
      if (!inBuild) switchMode('build')
    } else changeRoom((current) => reshapedRoom(current, shape))
  }

  // A final size from a field: null when applied, else the reason it was
  // refused.
  function commitSize(key, value) {
    const current = useRoomStore.getState().room
    const fit = openingsFit(current, resizedRoom(current, { [key]: value }))
    if (!fit.ok) return fit.message
    useRoomStore.getState().setRoomSize({ [key]: value })
    fitObjects()
    return null
  }

  const tallest = tallestOpening(room)

  return (
    <div className="field-stack">
      <ShapeCards shape={params.shape} onChoose={chooseShape} />
      {params.shape === 'l' && (
        // Until the corner picker of K.1.8.
        <div className="room-shapes">
          <IconButton label="Turn the L (move the cut away corner)" size="small" onClick={() => changeRoom(rotatedNotch)}>
            {ROTATE_ICON}
          </IconButton>
        </div>
      )}
      {params.shape === 'custom' && !inBuild && <p className="panel-notice">Custom shape. Edit it in Build.</p>}
      {[...FIELDS[params.shape], ['height', 'Height']].map(([key, label]) => (
        // While the pointer is over a field or it has the focus, the walls it
        // changes light up in the view (J.4.2).
        <div
          key={`${params.shape}-${key}`}
          onPointerEnter={() => highlight(key)}
          onPointerLeave={() => highlight(null)}
          onFocus={() => highlight(key)}
          onBlur={() => highlight(null)}
        >
          <MeasureField
            label={label}
            value={params[key]}
            limits={limitsFor(params, key, tallest)}
            unit="m"
            disabled={params.shape === 'custom' && key !== 'height'}
            invalid={problem?.key === key}
            describedBy={problemId}
            onCommit={(value) => commitSize(key, value)}
            onProblem={(message) => setProblem(message ? { key, message } : null)}
            onEditStart={beginGesture}
            onEditEnd={endGesture}
          />
        </div>
      ))}
      {params.shape === 'standard' && (
        // Until the Floor group of K.1.7 has its own link toggle.
        <Toggle
          label="Equal width and depth"
          checked={params.linked}
          onChange={(linked) => changeRoom((current) => linkedRoom(current, linked))}
          after={<span>Equal sides</span>}
        />
      )}
      {problem && (
        <p id={problemId} className="panel-problem" role="status">
          {problem.message}
        </p>
      )}
      {notice && (
        <p className="panel-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
