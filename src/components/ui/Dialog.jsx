import { useEffect, useId, useRef, useState } from 'react'
import Button from './Button'

// A modal dialog in the soft UI style, replacing the browser's confirm and
// prompt pop-ups. It opens when mounted, so render it only while it is needed.
// - `title` (bold) and `message` (optional, muted text below it).
// - `input`: optional { label, defaultValue } for a text field; the typed
//   text is passed to onConfirm. Without it, onConfirm gets no argument.
// - `confirmLabel` (primary button) and `cancelLabel` (default "Cancel").
// Escape, Cancel and a click outside the card call onCancel. Enter in the
// text field confirms. Focus starts in the text field (text selected), or on
// Cancel when there is none, so Enter never confirms a reset by accident.
export default function Dialog({ title, message, input, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }) {
  const dialogRef = useRef(null)
  const inputRef = useRef(null)
  const titleId = useId()
  const inputId = useId()
  const [value, setValue] = useState(input?.defaultValue ?? '')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    inputRef.current?.select()
    return () => dialog.close()
  }, [])

  // Escape: the browser would close the dialog itself; the parent decides.
  function handleCancelEvent(event) {
    event.preventDefault()
    onCancel()
  }

  // A click on the dialog element itself (not its contents) is on the backdrop.
  function handleClick(event) {
    if (event.target === dialogRef.current) onCancel()
  }

  const confirm = () => (input ? onConfirm(value) : onConfirm())

  return (
    <dialog
      ref={dialogRef}
      className="ui-dialog"
      aria-labelledby={titleId}
      onCancel={handleCancelEvent}
      onClick={handleClick}
    >
      <div className="ui-dialog-card">
        <h2 className="ui-dialog-title" id={titleId}>
          {title}
        </h2>
        {message && <p className="ui-dialog-message">{message}</p>}
        {input && (
          <div className="ui-dialog-field">
            <label htmlFor={inputId}>{input.label}</label>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  confirm()
                }
              }}
            />
          </div>
        )}
        <div className="ui-dialog-actions">
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="primary" onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
