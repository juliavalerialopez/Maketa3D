import SplitLayout from '../layout/SplitLayout'
import PersonalizePanel from '../panel/PersonalizePanel'
import { useModeStore } from '../../store/modeStore'
import { useUiStore } from '../../store/uiStore'

// One 16:9 image slot with a caption above it.
function RenderSlot({ caption, children }) {
  return (
    <figure className="render-slot">
      <figcaption>{caption}</figcaption>
      <div className="render-image">{children}</div>
    </figure>
  )
}

// Personalize mode: Room render above the (empty) AI image on the left,
// control panel on the right. Starts at 60 | 40; the panel stays 15–50%.
// Holds no state of its own, so nothing is lost when it unmounts.
export default function PersonalizeMode() {
  const snapshot = useModeStore((state) => state.snapshot)
  const personalizePercent = useUiStore((state) => state.personalizePercent)
  const setPersonalizePercent = useUiStore((state) => state.setPersonalizePercent)

  return (
    <SplitLayout
      left={
        <div className="render-stack">
          <RenderSlot caption="Room render">
            {snapshot ? <img src={snapshot} alt="Room render" /> : 'No render'}
          </RenderSlot>
          <RenderSlot caption="AI image" />
        </div>
      }
      right={<PersonalizePanel />}
      percent={personalizePercent}
      onPercentChange={setPersonalizePercent}
      min={50}
      max={85}
    />
  )
}
