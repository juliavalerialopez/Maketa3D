import { useEffect, useId, useState } from 'react'
import { linkedRoom, reshapedRoom, resizedRoom, roomParams, rotatedNotch, useRoomStore, wallsChangedBy } from '../../store/roomStore'
import { roomArea } from '../../store/roomShape'
import { useObjectsStore } from '../../store/objectsStore'
import { movedInsideNotice, useUiStore } from '../../store/uiStore'
import { tallestOpening } from '../../store/openings'
import { floorArea, limitsFor, openingsFit } from '../../store/roomMeasure'
import { beginGesture, endGesture } from '../../store/historyStore'
import { switchMode } from '../layout/modeSwitch'
import MeasureField from '../ui/MeasureField'
import IconButton from '../ui/IconButton'
import ShapeCards from './ShapeCards'
import LinkToggle from './LinkToggle'
import AreaReadout from './AreaReadout'
import GroupMessage from './GroupMessage'

// How long the "moved inside" notice stays, in seconds.
const NOTICE_SECONDS = 5

const ROTATE_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" />
  </svg>
)

// A group of rows under a small header (K.1.7).
function RoomGroup({ title, children }) {
  return (
    <div className="room-group">
      <p className="panel-group-title">{title}</p>
      {children}
    </div>
  )
}

// Room configuration: the shape cards, then the sizes in groups: Floor (Width,
// Depth, the link between them, the area), Cut-out (an L's) and Ceiling (J.4,
// K.1.5, K.1.7). A size is typed as text and applied when it is final (Enter,
// blur, an arrow key, a step button); one that is not a number, is outside its
// limits or would leave a door or window not fitting its wall is refused, and
// the message shows under its group. In Plan, objects move inside the walls
// once a size is final (I.1), and right after a new shape or a turned notch;
// after a shape change a short notice says how many moved. A shape change and
// the moves it causes are one undo step. In Build (`inBuild`, J.5) the same
// cards and sizes show (J.5.4); objects are not moved there but when Build
// closes.
export default function RoomInputs({ inBuild = false }) {
  const room = useRoomStore((state) => state.room)
  const notice = useUiStore((state) => state.roomNotice)
  const params = roomParams(room)
  // The last refused value: { key, message } (key is the field it was typed
  // in, or the group's first field for a change of the whole room), or null.
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
  // message under the group of `key` when a door or window would not fit;
  // otherwise applied with the objects it pushes inside as one undo step, and
  // the notice.
  function changeRoom(change, key) {
    const current = useRoomStore.getState().room
    const next = change(current)
    if (next === current) return
    const fit = openingsFit(current, next)
    if (!fit.ok) {
      setProblem({ key, message: fit.message })
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
    } else changeRoom((current) => reshapedRoom(current, shape), 'width')
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
  const isCustom = params.shape === 'custom'

  // One size field. While the pointer is over it or it has the focus, the
  // walls it changes light up in the view (J.4.2).
  const field = (key, label) => (
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
        disabled={isCustom && key !== 'height'}
        invalid={problem?.key === key}
        describedBy={problemId}
        onCommit={(value) => commitSize(key, value)}
        onProblem={(message) => setProblem(message ? { key, message } : null)}
        onEditStart={beginGesture}
        onEditEnd={endGesture}
      />
    </div>
  )

  // The message when it belongs to one of `keys`.
  const messageFor = (keys) =>
    problem && keys.includes(problem.key) ? <GroupMessage id={problemId}>{problem.message}</GroupMessage> : null

  // A shape is Standard, L or Custom: only the L has a Cut-out group.
  const area = isCustom ? roomArea(room.corners) : floorArea(params)

  return (
    <div className="field-stack">
      <ShapeCards shape={params.shape} onChoose={chooseShape} />
      {isCustom && !inBuild && <p className="panel-notice">Custom shape. Edit it in Build.</p>}

      <RoomGroup title="Floor">
        {field('width', 'Width')}
        {params.shape === 'standard' && (
          <LinkToggle
            checked={params.linked}
            label="Keep width and depth equal"
            onChange={(linked) => changeRoom((current) => linkedRoom(current, linked), 'width')}
          />
        )}
        {field('depth', 'Depth')}
        <AreaReadout area={area} />
        {messageFor(['width', 'depth'])}
      </RoomGroup>

      {params.shape === 'l' && (
        <RoomGroup title="Cut-out">
          {field('notchWidth', 'Notch width')}
          {field('notchDepth', 'Notch depth')}
          {/* Until the corner picker of K.1.8. */}
          <IconButton
            label="Turn the L (move the cut away corner)"
            size="small"
            onClick={() => changeRoom(rotatedNotch, 'notchWidth')}
          >
            {ROTATE_ICON}
          </IconButton>
          {messageFor(['notchWidth', 'notchDepth'])}
        </RoomGroup>
      )}

      <RoomGroup title="Ceiling">
        {field('height', 'Height')}
        {messageFor(['height'])}
      </RoomGroup>

      {notice && (
        <p className="panel-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
