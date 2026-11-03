import { useShallow } from 'zustand/react/shallow'
import Section from './Section'
import ReferenceCard from './ReferenceCard'
import Button from '../ui/Button'
import { objectLabel } from '../objects/catalog'
import { useObjectsStore } from '../../store/objectsStore'
import { isOutOfFrame, ROOM_REFERENCE, useRestyleStore } from '../../store/restyleStore'
import { useModeStore } from '../../store/modeStore'

const ROOM_CREATIVE_TEXT = 'The AI will choose walls, floor and light to suit the pieces.'

// The "Reference" group, the only group in the Personalize panel: Clear All,
// the Reference Room card (walls, floor, light), then one card per placed
// object in the Objects list order, titled "Reference <name>", and the
// privacy notice. Generate (top bar) needs at least one photo on any card.
export default function ReferenceSection() {
  // Ids and labels only: moving or recoloring an object doesn't re-render this.
  const ids = useObjectsStore(useShallow((state) => state.objects.map((object) => object.id)))
  const labels = useObjectsStore(useShallow((state) => state.objects.map(objectLabel)))
  const clearReferencePhotos = useRestyleStore((state) => state.clearReferencePhotos)
  const notice = useRestyleStore((state) => state.notice)
  // Re-render when a new Room render (with new object positions) is taken.
  useModeStore((state) => state.snapshotObjects)

  return (
    <Section id="references" title="Reference">
      <div className="reference-section-actions">
        {notice && <p className="reference-section-notice">{notice}</p>}
        <Button onClick={clearReferencePhotos}>Clear All</Button>
      </div>
      <div className="reference-cards">
        <ReferenceCard referenceKey={ROOM_REFERENCE} title="Reference Room" creativeText={ROOM_CREATIVE_TEXT} />
        {ids.map((id, index) => (
          <ReferenceCard
            key={id}
            referenceKey={id}
            title={`Reference ${labels[index]}`}
            outOfFrame={isOutOfFrame(id)}
          />
        ))}
      </div>
      {ids.length === 0 && <p className="panel-placeholder">Add objects in Plan to give them a reference.</p>}
      <p className="panel-notice">
        Your photos are sent to Google's Gemini API to make the image. Maketa does not store them. Google may keep
        requests for a short time to detect misuse.
      </p>
    </Section>
  )
}
