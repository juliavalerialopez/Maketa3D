import { useEffect, useId, useRef, useState } from 'react'
import { parseMeasure, stepMeasure, validateMeasure } from '../../store/roomMeasure'

const text = (value) => String(Math.round(value * 1000) / 1000)

// A size in meters typed as text (K.1.5). The number is applied when it is
// final: Enter, blur, an arrow key or a step button, never while typing. Comma
// and dot are both decimal separators. A value that is not a number, is outside
// `limits` ([min, max]) or that `onCommit` refuses is not applied: the field
// keeps its last valid value and `onProblem` gets the message. Escape puts the
// last valid value back. Up and Down step 0.1 m, with Shift 1 m. All the text
// is selected on focus.
//
// `limitNote` (optional) is added to the message of a value outside `limits`,
// to say why the limit is where it is.
//
// `onCommit(value)` applies the value and returns nothing, or a message to
// refuse it. `onProblem(message)` is called with the message, or null once a
// value is applied. `invalid` marks the field as the one the message is about,
// and `describedBy` is the id of that message.
//
// `onEditStart` and `onEditEnd` frame one edit (one undo step): from focus
// until blur; a step button is an edit of its own.
export default function MeasureField({
  label,
  value,
  limits,
  limitNote,
  unit,
  disabled = false,
  invalid = false,
  describedBy,
  onCommit,
  onProblem,
  onEditStart,
  onEditEnd,
}) {
  const id = useId()
  const [draft, setDraft] = useState(text(value))
  const [focused, setFocused] = useState(false)
  const [lastValue, setLastValue] = useState(value)
  const inputRef = useRef(null)
  const justFocused = useRef(false)
  const editingRef = useRef(false)

  function startEdit() {
    if (editingRef.current) return
    editingRef.current = true
    onEditStart?.()
  }

  function endEdit() {
    if (!editingRef.current) return
    editingRef.current = false
    onEditEnd?.()
  }

  // A field removed while it is being edited (no blur comes) ends its edit.
  useEffect(
    () => () => {
      if (!editingRef.current) return
      editingRef.current = false
      onEditEnd?.()
    },
    [onEditEnd],
  )

  if (value !== lastValue) {
    setLastValue(value)
    if (!focused) setDraft(text(value))
  }

  function refuse(message) {
    setDraft(text(value))
    onProblem?.(message)
  }

  // Applies a typed or stepped number; false when it was refused.
  function commit(number) {
    const result = validateMeasure(number, limits, label)
    if (!result.ok) {
      refuse(result.reason === 'range' && limitNote ? `${result.message} ${limitNote}` : result.message)
      return false
    }
    const problem = result.value === value ? null : onCommit(result.value)
    if (problem) {
      refuse(problem)
      return false
    }
    setDraft(text(result.value))
    onProblem?.(null)
    return true
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(parseMeasure(draft))
      inputRef.current.select()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(text(value))
      onProblem?.(null)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const current = parseMeasure(draft) ?? value
      commit(stepMeasure(current, event.key === 'ArrowUp' ? 1 : -1, event.shiftKey))
    }
  }

  function handleFocus(event) {
    setFocused(true)
    startEdit()
    justFocused.current = true
    event.target.select()
  }

  // The press that focused the field must not drop the selection again.
  function handleMouseUp(event) {
    if (!justFocused.current) return
    justFocused.current = false
    event.preventDefault()
  }

  function handleBlur() {
    setFocused(false)
    justFocused.current = false
    if (draft !== text(value)) commit(parseMeasure(draft))
    endEdit()
  }

  // A step button is an edit of its own, unless the field is being edited.
  function handleStep(direction) {
    if (editingRef.current) return commit(stepMeasure(value, direction))
    startEdit()
    commit(stepMeasure(value, direction))
    endEdit()
  }

  const stepButton = (direction, symbol, name) => (
    <button
      type="button"
      className="ui-measure-step"
      aria-label={`${name} ${label}`}
      title={`${name} ${label} by 0.1`}
      disabled={disabled}
      onClick={() => handleStep(direction)}
    >
      {symbol}
    </button>
  )

  return (
    <div className={disabled ? 'ui-measure-field disabled' : 'ui-measure-field'}>
      <label className="ui-measure-label" htmlFor={id}>
        {label}
      </label>
      {stepButton(-1, '−', 'Decrease')}
      <div className="ui-measure-input">
        <input
          id={id}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? describedBy : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseUp={handleMouseUp}
        />
        {unit && (
          <span className="ui-measure-unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
      {stepButton(1, '+', 'Increase')}
    </div>
  )
}
