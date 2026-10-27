import { useModeStore } from '../../store/modeStore'

// Personalize mode. Placeholder until the layout task (E.7): shows the raw
// Room render so the snapshot can be checked.
export default function PersonalizeMode() {
  const snapshot = useModeStore((state) => state.snapshot)

  return (
    <div className="personalize-placeholder">
      {snapshot ? <img src={snapshot} alt="Room render" /> : 'No render'}
    </div>
  )
}
