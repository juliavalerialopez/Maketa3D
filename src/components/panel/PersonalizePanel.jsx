import ReferenceSection from './ReferenceSection'

// Personalize control panel, same style as Plan's. Groups are <Section id="...">
// children, built from the shared ui/ parts. Generate is in the top bar.
export default function PersonalizePanel() {
  return (
    <div className="control-panel">
      <ReferenceSection />
    </div>
  )
}
