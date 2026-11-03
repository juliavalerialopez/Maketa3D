import { useShallow } from 'zustand/react/shallow'
import Section from './Section'
import ReferenceCard from './ReferenceCard'
import { objectLabel } from '../objects/catalog'
import { useObjectsStore } from '../../store/objectsStore'

// "Reference" group: one card per placed object, in the Objects list order,
// titled "Reference <name>" (e.g. "Reference Sofa 1").
export default function ReferenceSection() {
  // Ids and labels only: moving or recoloring an object doesn't re-render this.
  const ids = useObjectsStore(useShallow((state) => state.objects.map((object) => object.id)))
  const labels = useObjectsStore(useShallow((state) => state.objects.map(objectLabel)))

  return (
    <Section id="references" title="Reference">
      {ids.length === 0 ? (
        <p className="panel-placeholder">Add objects in Plan to give them a reference.</p>
      ) : (
        <div className="reference-cards">
          {ids.map((id, index) => (
            <ReferenceCard key={id} referenceKey={id} title={`Reference ${labels[index]}`} />
          ))}
        </div>
      )}
    </Section>
  )
}
