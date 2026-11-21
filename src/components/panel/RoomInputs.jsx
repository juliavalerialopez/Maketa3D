import { useEffect, useId, useState } from 'react'
import { linkedRoom, notchedRoom, reshapedRoom, resizedRoom, roomParams, useRoomStore, wallsChangedBy } from '../../store/roomStore'
import { roomArea } from '../../store/roomShape'
import { useObjectsStore } from '../../store/objectsStore'
import { movedInsideNotice, useUiStore } from '../../store/uiStore'
import { tallestOpening } from '../../store/openings'
import { floorArea, limitsFor, openingsFit } from '../../store/roomMeasure'
import { beginGesture, endGesture } from '../../store/historyStore'
import MeasureField from '../ui/MeasureField'
import IconButton from '../ui/IconButton'
import { TOOL_NOTICES } from './toolNotices'
import ShapeCards from './ShapeCards'
import CornerPicker from './CornerPicker'
import LinkToggle from './LinkToggle'
import AreaReadout from './AreaReadout'
import GroupMessage from './GroupMessage'

// How long the "moved inside" notice stays, in seconds.
const NOTICE_SECONDS = 5

const RESET_LABEL = 'Reset room: a 5 × 5 m Standard room, 2.6 m high. Doors and windows are removed. Undo with Ctrl+Z.'

const RESET_ICON = (
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
// Depth, the link between them), the floor area, Cut-out (an L's sizes and its
// corner) and Ceiling (J.4, K.1.5, K.1.7, K.1.8). A size is typed as text and
// applied when it is final (Enter, blur, an arrow key, a step button); one that
// is not a number, is outside its limits or would leave a door or window not
// fitting its wall is refused, and the message shows under its group. Objects
// move inside the walls once a size is final (I.1), and right after a new
// shape or a new cut-out corner; after a shape change a short notice says how
// many moved. A shape change and the moves it causes are one undo step.
// Custom is the Cut tool (K.1.16).
export default function RoomInputs() {
  const room = useRoomStore((state) => state.room)
  const notice = useUiStore((state) => state.roomNotice)
  const cutting = useUiStore((state) => state.tool === 'cut')
  const inWalk = useUiStore((state) => state.sceneView === 'walk')
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
  const fitObjects = () => useObjectsStore.getState().fitToRoom(useRoomStore.getState().room)

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

  // Reset room (K.1.10): the default room, which has no doors or windows, so
  // the openings rule does not apply. The pieces it pushes inside and the room
  // are one undo step.
  function resetRoom() {
    setProblem(null)
    beginGesture()
    useRoomStore.getState().resetRoom()
    const moved = fitObjects()
    endGesture()
    useUiStore.getState().setRoomNotice(movedInsideNotice(moved))
  }

  // Custom is the Cut tool (K.1.16): it turns on and off, with nothing else
  // selected. Standard and L-shape change the room.
  function chooseShape(shape) {
    if (shape !== 'custom') {
      changeRoom((current) => reshapedRoom(current, shape), 'width')
      return
    }
    const ui = useUiStore.getState()
    if (ui.tool === 'cut') {
      ui.setTool(null)
      return
    }
    useObjectsStore.getState().selectObject(null)
    // Selecting nothing ends any other tool; then the Cut tool starts.
    ui.selectOpening(null)
    ui.selectWall(null)
    ui.setTool('cut')
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

  // Why a limit is where it is, when it depends on the cut-out.
  function limitNote(key) {
    if (params.shape !== 'l') return undefined
    const [side, cut] = key === 'width' ? ['room width', params.notchWidth] : key === 'depth' ? ['room depth', params.notchDepth] : []
    if (side) return `The cut-out is ${cut} m, and 0.5 m of the ${side} must stay beside it.`
    if (key === 'notchWidth' || key === 'notchDepth') return `0.5 m of the ${key === 'notchWidth' ? 'width' : 'depth'} must stay beside the cut-out.`
    return undefined
  }

  // One size field. While the pointer is over it or it has the focus, the
  // walls it changes light up in the view (J.4.2).
  const field = (key, label, name = label) => (
    <div
      key={`${params.shape}-${key}`}
      onPointerEnter={() => highlight(key)}
      onPointerLeave={() => highlight(null)}
      onFocus={() => highlight(key)}
      onBlur={() => highlight(null)}
    >
      <MeasureField
        label={label}
        name={name}
        value={params[key]}
        limits={limitsFor(params, key, tallest)}
        limitNote={limitNote(key)}
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
      <ShapeCards shape={params.shape} cutting={cutting} cutDisabled={inWalk} onChoose={chooseShape} />
      {cutting && <p className="panel-notice">{TOOL_NOTICES.cut}</p>}
      {isCustom && !cutting && <p className="panel-notice">Custom shape. Drag its walls, or cut one with Custom.</p>}

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
        {messageFor(['width', 'depth'])}
      </RoomGroup>

      {params.shape === 'l' && (
        <RoomGroup title="Cut-out">
          {field('notchWidth', 'Width', 'Cut-out width')}
          {field('notchDepth', 'Depth', 'Cut-out depth')}
          <CornerPicker notch={params.notch} onChoose={(notch) => changeRoom((current) => notchedRoom(current, notch), 'notchWidth')} />
          {messageFor(['notchWidth', 'notchDepth'])}
        </RoomGroup>
      )}

      <AreaReadout area={area} />

      <RoomGroup title="Ceiling">
        {field('height', 'Height')}
        {messageFor(['height'])}
      </RoomGroup>

      <div className="reset-room-row">
        <IconButton className="reset-room" label={RESET_LABEL} onClick={resetRoom}>
          {RESET_ICON}
        </IconButton>
        <span>Reset room</span>
      </div>

      {notice && (
        <p className="panel-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
