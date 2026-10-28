import { useRef } from 'react'
import Section from './Section'
import Button from '../ui/Button'
import { useRestyleStore } from '../../store/restyleStore'

// "Reference image" group: one photo of a styled room, used for both the sofa
// and the room style. The file input is hidden; the shared Button opens it.
export default function ReferenceImage() {
  const photo = useRestyleStore((state) => state.photo)
  const photoError = useRestyleStore((state) => state.photoError)
  const setPhotoFile = useRestyleStore((state) => state.setPhotoFile)
  const removePhoto = useRestyleStore((state) => state.removePhoto)
  const inputRef = useRef(null)

  const choose = () => inputRef.current?.click()
  const handleChange = (event) => {
    const file = event.target.files?.[0]
    // Reset, so choosing the same file again still fires a change.
    event.target.value = ''
    if (file) setPhotoFile(file)
  }

  return (
    <Section id="reference-image" title="Reference image">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleChange} />
      {photo ? (
        <div className="reference-photo">
          <img src={photo.dataUrl} alt={`Reference photo: ${photo.name}`} />
          <div className="reference-photo-actions">
            <Button onClick={choose}>Replace</Button>
            <Button onClick={removePhoto}>Remove</Button>
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
      <p className="panel-notice">
        Your photo is sent to Google's Gemini API to make the image. Maketa does not store it. Google may keep
        requests for a short time to detect misuse.
      </p>
    </Section>
  )
}
