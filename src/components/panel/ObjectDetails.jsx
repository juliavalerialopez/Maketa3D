import { objectLabel } from '../objects/catalog'
import { selectSelectedObject, useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { positionLimits } from '../../store/roomBounds'
import NumberField from '../ui/NumberField'
import FieldGroup from '../ui/FieldGroup'
import ColorField from '../ui/ColorField'
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
      <FieldGroup title="Location" unit="m">
        <NumberField
          compact
          label="X"
          value={x}
          onChange={(value) => updateObject(object.id, { position: [value, y, z] })}
          min={limits.x[0]}
          max={limits.x[1]}
        />
        <NumberField
          compact
          label="Z"
          value={z}
          onChange={(value) => updateObject(object.id, { position: [x, y, value] })}
          min={limits.z[0]}
          max={limits.z[1]}
        />
      </FieldGroup>
      <NumberField
        label="Rotation"
        value={object.rotation[1] * DEGREES_PER_RADIAN}
        onChange={(value) =>
          updateObject(object.id, { rotation: [object.rotation[0], value / DEGREES_PER_RADIAN, object.rotation[2]] })
        }
        step={15}
        unit="°"
        normalize={(degrees) => ((degrees % 360) + 360) % 360}
      />
      <ColorField
        label="Color"
        value={object.color}
        onChange={(color) => updateObject(object.id, { color })}
      />
      <Button onClick={() => removeObject(object.id)}>Delete</Button>
    </div>
  )
}
