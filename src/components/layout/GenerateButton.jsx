import { useEffect } from 'react'
import Button from '../ui/Button'
import { limitMessage, MESSAGES } from '../../services/restyle'
import { useModeStore } from '../../store/modeStore'
import { MAX_VERSIONS, selectSelectedVersion, useRestyleStore } from '../../store/restyleStore'

// Generate / Regenerate in the top bar (Personalize only), before the theme
// switch: a short message when there is one (error, limit, 6 versions), the
// "N of X left today" count, then the button. "Regenerate" when a version is
// shown in the AI image. Blocked at MAX_VERSIONS until one is deleted.
export default function GenerateButton() {
  const snapshot = useModeStore((state) => state.snapshot)
  const photo = useRestyleStore((state) => state.photo)
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
  const disabled = !photo || !snapshot || status === 'loading' || limitReached || versionsFull
  const message =
    error ??
    (limitReached ? limitMessage(limit, { visitorLimit, totalLimit }) : null) ??
    (versionsFull ? MESSAGES.maxVersions : null)

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
