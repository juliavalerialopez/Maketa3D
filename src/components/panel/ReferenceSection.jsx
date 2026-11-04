import Section from './Section'
import ReferenceCard from './ReferenceCard'
import Button from '../ui/Button'
import { objectLabel } from '../objects/catalog'
import { useObjectsStore } from '../../store/objectsStore'
import { ROOM_REFERENCE, useReferenceObjects, useRestyleStore } from '../../store/restyleStore'

const ROOM_CREATIVE_TEXT = 'The AI will choose walls, floor and light to suit the pieces.'

// "Hidden: Sofa 2." from a list of objects; null when there are none.
const namesLine = (title, objects) => (objects.length > 0 ? `${title}: ${objects.map(objectLabel).join(', ')}.` : null)

// The "Reference" group, the only group in the Personalize panel: Clear All,
// the Reference Room card (walls, floor, light), then one card per object
// that is shown and in the Room render (useReferenceObjects), titled
// "Reference <name>", in the Objects list order. Under the cards, one line
// each for hidden objects and for objects outside the Room render (H.6.2),
// then the privacy notice. A card's photo stays in memory while its object
// has no card, and comes back with it.
export default function ReferenceSection() {
  // Objects only change in Plan, so reading the whole list costs nothing here.
  const objects = useObjectsStore((state) => state.objects)
  const withCard = useReferenceObjects()
  const clearReferencePhotos = useRestyleStore((state) => state.clearReferencePhotos)
  const notice = useRestyleStore((state) => state.notice)

  const hidden = objects.filter((object) => object.hidden)
  // Not hidden and no card: outside the Room render. Hidden wins when both.
  const offFrame = objects.filter((object) => !object.hidden && !withCard.includes(object))

  return (
    <Section id="references" title="Reference">
      <div className="reference-section-actions">
        {notice && <p className="reference-section-notice">{notice}</p>}
        <Button onClick={clearReferencePhotos}>Clear All</Button>
      </div>
      <div className="reference-cards">
        <ReferenceCard referenceKey={ROOM_REFERENCE} title="Reference Room" creativeText={ROOM_CREATIVE_TEXT} />
        {withCard.map((object) => (
          <ReferenceCard key={object.id} referenceKey={object.id} title={`Reference ${objectLabel(object)}`} />
        ))}
      </div>
      {objects.length === 0 && <p className="panel-placeholder">Add objects in Plan to give them a reference.</p>}
      {[namesLine('Hidden', hidden), namesLine('Not in the Room render', offFrame)]
        .filter(Boolean)
        .map((line) => (
          <p key={line} className="reference-section-missing">
            {line}
          </p>
        ))}
      <p className="panel-notice">
        Your photos are sent to Google's Gemini API to make the image. Maketa does not store them. Google may keep
        requests for a short time to detect misuse.
      </p>
    </Section>
  )
}
