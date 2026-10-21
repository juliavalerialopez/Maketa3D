import { objectLabel } from '../objects/catalog'
import { selectSelectedObject, useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { positionLimits } from '../../store/roomBounds'
import NumberField from '../ui/NumberField'
import Button from '../ui/Button'

const DEGREES_PER_RADIAN = 180 / Math.PI

// Fields for the selected object. ControlPanel remounts this per object,
// so every field starts from the newly selected object's values.
export default function ObjectDetails() {
  const object = useObjectsStore(selectSelectedObject)
  const updateObject = useObjectsStore((state) => state.updateObject)
  const removeObject = useObjectsStore((state) => state.removeObject)
  const room = useRoomStore((state) => state.room)

  if (!object) return null

  const [x, y, z] = object.position
  const limits = positionLimits(object, room)

  return (
    <div className="field-stack">
      <p className="object-details-name">{objectLabel(object)}</p>
      <NumberField
        label="X"
        value={x}
        onChange={(value) => updateObject(object.id, { position: [value, y, z] })}
        min={-limits.x}
        max={limits.x}
        unit="m"
      />
      <NumberField
        label="Z"
        value={z}
        onChange={(value) => updateObject(object.id, { position: [x, y, value] })}
        min={-limits.z}
        max={limits.z}
        unit="m"
      />
      <NumberField
        label="Rotation"
        value={object.rotation * DEGREES_PER_RADIAN}
        onChange={(value) => updateObject(object.id, { rotation: value / DEGREES_PER_RADIAN })}
        step={15}
        unit="°"
        normalize={(degrees) => ((degrees % 360) + 360) % 360}
      />
      <label className="color-field">
        <span className="ui-number-field-label">Color</span>
        <input
          type="color"
          value={object.color}
          // React fires onChange on every input event, so the sofa recolors while dragging.
          onChange={(event) => updateObject(object.id, { color: event.target.value })}
        />
      </label>
      <Button onClick={() => removeObject(object.id)}>Delete</Button>
    </div>
  )
}
