import { ROOM_LIMITS, useRoomStore } from '../../store/roomStore'
import { useObjectsStore } from '../../store/objectsStore'
import NumberField from '../ui/NumberField'

const FIELDS = [
  { key: 'width', label: 'Width' },
  { key: 'depth', label: 'Depth' },
  { key: 'height', label: 'Height' },
]

export default function RoomInputs() {
  const room = useRoomStore((state) => state.room)
  const setRoomSize = useRoomStore((state) => state.setRoomSize)
  const fitToRoom = useObjectsStore((state) => state.fitToRoom)

  // Objects move inside the walls only once a size is final (I.1), never
  // while typing. The store already has the committed size here.
  const fitObjects = () => fitToRoom(useRoomStore.getState().room)

  return (
    <div className="field-stack">
      {FIELDS.map((field) => (
        <NumberField
          key={field.key}
          label={field.label}
          value={room[field.key]}
          onChange={(value) => setRoomSize({ [field.key]: value })}
          onCommit={fitObjects}
          min={ROOM_LIMITS[field.key][0]}
          max={ROOM_LIMITS[field.key][1]}
          unit="m"
        />
      ))}
    </div>
  )
}
