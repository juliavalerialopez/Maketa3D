import { useEffect, useRef } from 'react'

// Shared color input for the panel. React fires onChange on every input
// event, so onChange runs live while the user drags in the picker.
// `onEditStart` and `onEditEnd` (optional) frame one pick (I.11: one undo
// step): it starts with the first change and ends with the browser's own
// change event, when the picker is closed, or when the field goes away.
export default function ColorField({ label, value, onChange, onEditStart, onEditEnd }) {
  const inputRef = useRef(null)
  const editingRef = useRef(false)

  useEffect(() => {
    const input = inputRef.current
    const end = () => {
      if (!editingRef.current) return
      editingRef.current = false
      onEditEnd?.()
    }
    input.addEventListener('change', end)
    return () => {
      input.removeEventListener('change', end)
      end()
    }
  }, [onEditEnd])

  function handleInput(event) {
    // A browser that sends only the final change, with no input events
    // before it: that change is one edit on its own, never left open.
    if (event.nativeEvent.type === 'change' && !editingRef.current) {
      onEditStart?.()
      onChange(event.target.value)
      onEditEnd?.()
      return
    }
    if (!editingRef.current) {
      editingRef.current = true
      onEditStart?.()
    }
    onChange(event.target.value)
  }

  return (
    <label className="ui-color-field">
      <span className="ui-color-field-label">{label}</span>
      <input ref={inputRef} type="color" value={value} onChange={handleInput} />
    </label>
  )
}
