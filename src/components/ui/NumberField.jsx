import { useState } from 'react'

const round = (number) => Math.round(number * 1000) / 1000

// Shared number input for the panel. Typed numbers go to onChange immediately,
// unclamped; empty or invalid text is never sent. Up/Down step from the current
// value within min/max. On blur the value is limited (normalize if given,
// otherwise clamped to min/max) and sent once more. When `value` changes from
// outside (e.g. dragging in 3D) while the field is not focused, the text follows.
export default function NumberField({ label, value, onChange, min, max, step = 0.1, unit, normalize }) {
  const [draft, setDraft] = useState(String(round(value)))
  const [focused, setFocused] = useState(false)
  const [lastValue, setLastValue] = useState(value)

  // Adjusting state during render (React's pattern for reacting to a prop change).
  if (value !== lastValue) {
    setLastValue(value)
    if (!focused) setDraft(String(round(value)))
  }

  const clamp = (number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, number))

  // Handled here instead of by the browser, which counts steps from `min`
  // (with min -1.05, Up from 0 would give 0.05).
  function handleKeyDown(event) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const typed = parseFloat(draft)
    const current = Number.isFinite(typed) ? typed : value
    const next = round(clamp(current + (event.key === 'ArrowUp' ? step : -step)))
    setDraft(String(next))
    onChange(next)
  }

  function handleChange(event) {
    const text = event.target.value
    setDraft(text)
    const number = parseFloat(text)
    if (Number.isFinite(number)) onChange(number)
  }

  function handleBlur() {
    setFocused(false)
    const limited = normalize ? normalize(value) : clamp(value)
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
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
      />
      {unit && <span className="ui-number-field-unit">{unit}</span>}
    </label>
  )
}
