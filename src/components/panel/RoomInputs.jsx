import { useRoomStore } from '../../store/roomStore'
import NumberField from '../ui/NumberField'

const FIELDS = [
  { key: 'width', label: 'Width', min: 2, max: 10 },
  { key: 'depth', label: 'Depth', min: 2, max: 10 },
  { key: 'height', label: 'Height', min: 2, max: 4 },
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
          min={field.min}
          max={field.max}
          unit="m"
        />
      ))}
    </div>
  )
}
