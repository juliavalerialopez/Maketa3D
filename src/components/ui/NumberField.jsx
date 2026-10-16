import { useState } from 'react'

const round = (number) => Math.round(number * 1000) / 1000

// Shared number input for the panel. Typed numbers go to onChange immediately,
// unclamped; empty or invalid text is never sent. On blur the value is limited
// (normalize if given, otherwise clamped to min/max) and sent once more.
export default function NumberField({ label, value, onChange, min, max, step = 0.1, unit, normalize }) {
  const [draft, setDraft] = useState(String(round(value)))

  function handleChange(event) {
    const text = event.target.value
    setDraft(text)
    const number = parseFloat(text)
    if (Number.isFinite(number)) onChange(number)
  }

  function handleBlur() {
    const limited = normalize
      ? normalize(value)
      : Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value))
    const result = round(limited)
    onChange(result)
    setDraft(String(result))
  }

  return (
    <label className="ui-number-field">
      <span className="ui-number-field-label">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {unit && <span className="ui-number-field-unit">{unit}</span>}
    </label>
  )
}
