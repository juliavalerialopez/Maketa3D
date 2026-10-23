import { useRef, useState } from 'react'

const round = (number) => Math.round(number * 1000) / 1000

// Drag to change: how far the pointer moves before a press becomes a drag,
// and how many pixels make one step.
const DRAG_THRESHOLD = 3
const PIXELS_PER_STEP = 4

// Shared number input for the panel. Typed numbers go to onChange immediately,
// unclamped; empty or invalid text is never sent. Up/Down step from the current
// value within min/max. On blur the value is limited (normalize if given,
// otherwise clamped to min/max) and sent once more. When `value` changes from
// outside (e.g. dragging in 3D) while the field is not focused, the text follows.
//
// Pressing in the field and dragging left or right changes the value by one
// step per few pixels (within min/max); releasing limits it like a blur.
// A press without dragging focuses the field for typing.
//
// `compact` puts the label above the value, for use inside a FieldGroup.
export default function NumberField({ label, value, onChange, min, max, step = 0.1, unit, normalize, compact }) {
  const [draft, setDraft] = useState(String(round(value)))
  const [focused, setFocused] = useState(false)
  const [lastValue, setLastValue] = useState(value)
  const inputRef = useRef(null)
  // Active press: { pointerId, startX, startValue, dragging, current }.
  const pressRef = useRef(null)

  // Adjusting state during render (React's pattern for reacting to a prop change).
  if (value !== lastValue) {
    setLastValue(value)
    if (!focused) setDraft(String(round(value)))
  }

  const clamp = (number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, number))

  // Applies the limits used on blur and when a drag ends.
  function commit(number) {
    const result = round(normalize ? normalize(number) : clamp(number))
    onChange(result)
    setDraft(String(result))
  }

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
    commit(value)
  }

  // While not typing, the press is ours: no focus or text selection yet.
  function handleMouseDown(event) {
    if (!focused) event.preventDefault()
  }

  function handlePointerDown(event) {
    if (focused || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pressRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startValue: value,
      dragging: false,
      current: value,
    }
  }

  function handlePointerMove(event) {
    const press = pressRef.current
    if (!press || press.pointerId !== event.pointerId) return
    const dx = event.clientX - press.startX
    if (!press.dragging && Math.abs(dx) <= DRAG_THRESHOLD) return
    press.dragging = true
    const next = round(clamp(press.startValue + Math.round(dx / PIXELS_PER_STEP) * step))
    if (next === press.current) return
    press.current = next
    setDraft(String(next))
    onChange(next)
  }

  function handlePointerUp(event) {
    const press = pressRef.current
    if (!press || press.pointerId !== event.pointerId) return
    pressRef.current = null
    if (press.dragging) {
      commit(press.current)
    } else if (event.type === 'pointerup') {
      // A plain click: start typing, with the text selected.
      inputRef.current.focus()
      inputRef.current.select()
    }
  }

  return (
    <label className={compact ? 'ui-number-field compact' : 'ui-number-field'}>
      <span className="ui-number-field-label">{label}</span>
      <input
        ref={inputRef}
        type="number"
        step={step}
        value={draft}
        className={focused ? undefined : 'ui-number-field-draggable'}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onMouseDown={handleMouseDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      {unit && <span className="ui-number-field-unit">{unit}</span>}
    </label>
  )
}
