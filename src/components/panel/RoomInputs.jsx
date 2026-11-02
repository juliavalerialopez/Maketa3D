import { ROOM_LIMITS, useRoomStore } from '../../store/roomStore'
import NumberField from '../ui/NumberField'

const FIELDS = [
  { key: 'width', label: 'Width' },
  { key: 'depth', label: 'Depth' },
  { key: 'height', label: 'Height' },
]

export default function RoomInputs() {
  const room = useRoomStore((state) => state.room)
  const setRoomSize = useRoomStore((state) => state.setRoomSize)

  return (
    <div className="field-stack">
      {FIELDS.map((field) => (
        <NumberField
          key={field.key}
          label={field.label}
          value={room[field.key]}
          onChange={(value) => setRoomSize({ [field.key]: value })}
          min={ROOM_LIMITS[field.key][0]}
          max={ROOM_LIMITS[field.key][1]}
          unit="m"
        />
      ))}
    </div>
  )
}
