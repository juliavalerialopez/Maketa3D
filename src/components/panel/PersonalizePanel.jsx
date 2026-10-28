import GenerateButton from './GenerateButton'
import ReferenceImage from './ReferenceImage'

// Personalize control panel, same style as Plan's. Groups are <Section id="...">
// children, built from the shared ui/ parts.
export default function PersonalizePanel() {
  return (
    <div className="control-panel">
      <ReferenceImage />
      <GenerateButton />
    </div>
  )
}
