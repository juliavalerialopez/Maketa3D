import { objectLabel } from '../objects/catalog'

// Fields for the selected object. ControlPanel remounts this per object,
// so every field starts from the newly selected object's values.
export default function ObjectDetails({ object }) {
  return (
    <div className="field-stack">
      <p className="object-details-name">{objectLabel(object)}</p>
    </div>
  )
}
