import { useRef } from 'react'
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
export default function ReferenceCard({ referenceKey, title, creativeText = DEFAULT_CREATIVE_TEXT }) {
  const { mode, photo, photoError } = useRestyleStore(selectReference(referenceKey))
  const setReferenceMode = useRestyleStore((state) => state.setReferenceMode)
  const setReferencePhotoFile = useRestyleStore((state) => state.setReferencePhotoFile)
  const removeReferencePhoto = useRestyleStore((state) => state.removeReferencePhoto)
  const inputRef = useRef(null)

  const choose = () => inputRef.current?.click()
  const handleChange = (event) => {
    const file = event.target.files?.[0]
    // Reset, so choosing the same file again still fires a change.
    event.target.value = ''
    if (file) setReferencePhotoFile(referenceKey, file)
  }

  return (
    <div className="reference-card">
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
