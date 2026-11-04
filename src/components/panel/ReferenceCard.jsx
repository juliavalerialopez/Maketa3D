import { useRef, useState } from 'react'
import Button from '../ui/Button'
import SegmentedSwitch from '../ui/SegmentedSwitch'
import { selectReference, useRestyleStore } from '../../store/restyleStore'

const MODES = [
  { value: 'reference', label: 'Reference' },
  { value: 'creative', label: 'Creative' },
]

const DEFAULT_CREATIVE_TEXT = 'The AI will design this one to match the room.'

// One reference card: a title, the Reference | Creative switch, then the photo
// (Upload, or a preview with Replace and Remove) in Reference mode, or a short
// line in Creative mode. `referenceKey` is an object id or ROOM_REFERENCE.
// The file input is hidden; the shared Button opens it.
// In Reference mode the card also takes a dropped file (I.10), checked
// exactly like an uploaded one; a Creative card ignores drops.
export default function ReferenceCard({ referenceKey, title, creativeText = DEFAULT_CREATIVE_TEXT }) {
  const { mode, photo, photoError } = useRestyleStore(selectReference(referenceKey))
  const setReferenceMode = useRestyleStore((state) => state.setReferenceMode)
  const setReferencePhotoFile = useRestyleStore((state) => state.setReferencePhotoFile)
  const removeReferencePhoto = useRestyleStore((state) => state.removeReferencePhoto)
  const inputRef = useRef(null)
  // A file is held over the card (highlight only).
  const [dropTarget, setDropTarget] = useState(false)
  const takesDrops = mode === 'reference'

  const choose = () => inputRef.current?.click()
  const handleChange = (event) => {
    const file = event.target.files?.[0]
    // Reset, so choosing the same file again still fires a change.
    event.target.value = ''
    if (file) setReferencePhotoFile(referenceKey, file)
  }

  const holdsFile = (event) => event.dataTransfer.types.includes('Files')
  const handleDragOver = (event) => {
    if (!takesDrops || !holdsFile(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDropTarget(true)
  }
  // Moving over a child of the card also fires dragleave; only leaving the
  // card itself ends the highlight.
  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(false)
  }
  const handleDrop = (event) => {
    setDropTarget(false)
    if (!takesDrops) return
    event.preventDefault()
    // Several files: the first one is used.
    const file = event.dataTransfer.files?.[0]
    if (file) setReferencePhotoFile(referenceKey, file)
  }

  return (
    <div
      className={dropTarget && takesDrops ? 'reference-card drop-target' : 'reference-card'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p className="reference-card-title">{title}</p>
      <SegmentedSwitch
        options={MODES}
        value={mode}
        onChange={(next) => setReferenceMode(referenceKey, next)}
        label={`${title}: mode`}
        size="small"
      />
      {mode === 'creative' ? (
        <p className="reference-card-note">{creativeText}</p>
      ) : (
        <>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleChange} />
          {photo ? (
            <div className="reference-photo">
              <img src={photo.dataUrl} alt={`${title}: ${photo.name}`} />
              <div className="reference-photo-actions">
                <Button onClick={choose}>Replace</Button>
                <Button onClick={() => removeReferencePhoto(referenceKey)}>Remove</Button>
              </div>
            </div>
          ) : (
            <Button onClick={choose}>Upload photo</Button>
          )}
          {photoError && (
            <p className="panel-error" role="alert">
              {photoError}
            </p>
          )}
        </>
      )}
    </div>
  )
}
