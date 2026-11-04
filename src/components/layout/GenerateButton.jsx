import { useEffect } from 'react'
import Button from '../ui/Button'
import { limitMessage, MESSAGES } from '../../services/restyle'
import { useModeStore } from '../../store/modeStore'
import {
  MAX_VERSIONS,
  selectPhotoCount,
  selectSelectedVersion,
  useReferenceObjects,
  useRestyleStore,
} from '../../store/restyleStore'

// Generate / Regenerate in the top bar (Personalize only), before the theme
// switch: a short message when there is one (error, limit, 6 versions, no
// photo), the "N of X left today" count, then the button. "Regenerate" when a
// version is shown in the AI image. Blocked at MAX_VERSIONS until one is
// deleted, and until at least one card has a photo.
export default function GenerateButton() {
  const snapshot = useModeStore((state) => state.roomRender?.image)
  // Which cards are sent depends on the objects and the Room render's camera.
  const referenceObjects = useReferenceObjects()
  const hasPhoto = useRestyleStore((state) => selectPhotoCount(state, referenceObjects) > 0)
  const status = useRestyleStore((state) => state.status)
  const error = useRestyleStore((state) => state.error)
  const hasVersion = useRestyleStore((state) => selectSelectedVersion(state) !== undefined)
  const versionsFull = useRestyleStore((state) => state.versions.length >= MAX_VERSIONS)
  const remaining = useRestyleStore((state) => state.remaining)
  const limit = useRestyleStore((state) => state.limit)
  const visitorLimit = useRestyleStore((state) => state.visitorLimit)
  const totalLimit = useRestyleStore((state) => state.totalLimit)
  const generate = useRestyleStore((state) => state.generate)
  const loadRemaining = useRestyleStore((state) => state.loadRemaining)

  useEffect(() => {
    loadRemaining()
  }, [loadRemaining])

  const limitReached = remaining === 0
  const disabled = !hasPhoto || !snapshot || status === 'loading' || limitReached || versionsFull
  const message =
    error ??
    (limitReached ? limitMessage(limit, { visitorLimit, totalLimit }) : null) ??
    (versionsFull ? MESSAGES.maxVersions : null) ??
    (hasPhoto ? null : MESSAGES.noPhoto)

  return (
    <div className="generate">
      {message && (
        <span className="generate-message" role="alert">
          {message}
        </span>
      )}
      {remaining !== null && (
        <span className="generate-count">
          {remaining}
          {visitorLimit !== null && ` of ${visitorLimit}`} left today
        </span>
      )}
      <Button variant="primary" onClick={generate} disabled={disabled}>
        {hasVersion ? 'Regenerate' : 'Generate'}
      </Button>
    </div>
  )
}
