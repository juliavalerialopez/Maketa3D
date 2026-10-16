import { useState } from 'react'
import { useRoomStore } from '../../store/roomStore'

const FIELDS = [
  { key: 'width', label: 'Width', min: 2, max: 10 },
  { key: 'depth', label: 'Depth', min: 2, max: 10 },
  { key: 'height', label: 'Height', min: 2, max: 4 },
]

function DimensionInput({ field }) {
  const value = useRoomStore((state) => state.room[field.key])
  const setRoomSize = useRoomStore((state) => state.setRoomSize)
  // Local draft so empty or half-typed input never reaches the store.
  const [draft, setDraft] = useState(String(value))

  function handleChange(event) {
    const text = event.target.value
    setDraft(text)
    const number = parseFloat(text)
    if (Number.isFinite(number)) setRoomSize({ [field.key]: number })
  }

  function handleBlur() {
    const clamped = Math.min(field.max, Math.max(field.min, value))
    setRoomSize({ [field.key]: clamped })
    setDraft(String(clamped))
  }

  return (
    <label className="dimension-input">
      <span className="dimension-label">{field.label}</span>
      <input
        type="number"
        step={0.1}
        min={field.min}
        max={field.max}
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <span className="dimension-unit">m</span>
    </label>
  )
}

export default function RoomInputs() {
  return (
    <div className="room-inputs">
      {FIELDS.map((field) => (
        <DimensionInput key={field.key} field={field} />
      ))}
    </div>
  )
}
