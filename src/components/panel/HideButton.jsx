import IconButton from '../ui/IconButton'
import { useObjectsStore } from '../../store/objectsStore'

const EyeIcon = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
)

const EyeOffIcon = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8s2.4-4.5 6.5-4.5c1.2 0 2.3.4 3.2 1M14.5 8s-2.4 4.5-6.5 4.5c-1.2 0-2.3-.4-3.2-1" />
    <path d="M2.5 13.5l11-11" />
  </svg>
)

// The Hide switch for one object (H.6.2), in the Objects list and in Object
// details: an eye while it is shown (click to hide), an eye with a line
// through it while it is hidden (click to show).
export default function HideButton({ object, name }) {
  const setHidden = useObjectsStore((state) => state.setHidden)
  const hidden = Boolean(object.hidden)
  return (
    <IconButton
      label={hidden ? `Show ${name}` : `Hide ${name}`}
      size="small"
      className={hidden ? 'hide-button hidden' : 'hide-button'}
      onClick={() => setHidden(object.id, !hidden)}
    >
      {hidden ? EyeOffIcon : EyeIcon}
    </IconButton>
  )
}
