import { useEffect } from 'react'
import Button from '../ui/Button'
import { limitMessage, VISITOR_LIMIT } from '../../services/restyle'
import { useModeStore } from '../../store/modeStore'
import { useRestyleStore } from '../../store/restyleStore'

// Generate / Regenerate, below the Reference image group and always visible.
// "Regenerate" when the AI image shows a result for the current Room render.
export default function GenerateButton() {
  const snapshot = useModeStore((state) => state.snapshot)
  const photo = useRestyleStore((state) => state.photo)
  const status = useRestyleStore((state) => state.status)
  const error = useRestyleStore((state) => state.error)
  const result = useRestyleStore((state) => state.result)
  const resultSnapshot = useRestyleStore((state) => state.resultSnapshot)
  const remaining = useRestyleStore((state) => state.remaining)
  const limit = useRestyleStore((state) => state.limit)
  const generate = useRestyleStore((state) => state.generate)
  const loadRemaining = useRestyleStore((state) => state.loadRemaining)

  useEffect(() => {
    loadRemaining()
  }, [loadRemaining])

  const hasResult = result !== null && resultSnapshot === snapshot
  const limitReached = remaining === 0
  const disabled = !photo || !snapshot || status === 'loading' || limitReached
  const message = error ?? (limitReached ? limitMessage(limit) : null)

  return (
    <div className="generate">
      <div className="generate-row">
        <Button onClick={generate} disabled={disabled}>
          {hasResult ? 'Regenerate' : 'Generate'}
        </Button>
        {remaining !== null && (
          <span className="generate-count">
            {remaining} of {VISITOR_LIMIT} left today
          </span>
        )}
      </div>
      {message && (
        <p className="panel-error" role="alert">
          {message}
        </p>
      )}
    </div>
  )
}
