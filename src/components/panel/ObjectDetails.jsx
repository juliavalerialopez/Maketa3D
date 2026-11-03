import { OBJECT_TYPES, objectLabel } from '../objects/catalog'
import { selectSelectedObject, useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import { clampPosition, positionLimits } from '../../store/roomBounds'
import NumberField from '../ui/NumberField'
import FieldGroup from '../ui/FieldGroup'
import ColorField from '../ui/ColorField'
import Button from '../ui/Button'
import HideButton from './HideButton'

const DEGREES_PER_RADIAN = 180 / Math.PI
const normalizeDegrees = (degrees) => ((degrees % 360) + 360) % 360

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
  const type = OBJECT_TYPES[object.type]
  const screen = type.screenInches

  // Whole inches within the type's range.
  const limitInches = (inches) => Math.round(Math.min(screen.max, Math.max(screen.min, inches)))

  // A new screen size changes the footprint, so the position is clamped with it.
  function setScreenInches(value) {
    const screenInches = limitInches(value)
    const size = type.sizeFor(screenInches)
    const position = clampPosition({ ...object, size }, room, x, z)
    updateObject(object.id, { screenInches, size, position })
  }

  // A new rotation changes the footprint, so the position is clamped with it.
  function setRotation(axisIndex, degrees) {
    const rotation = object.rotation.map((value, index) =>
      index === axisIndex ? degrees / DEGREES_PER_RADIAN : value,
    )
    const position = clampPosition({ ...object, rotation }, room, x, z)
    updateObject(object.id, { rotation, position })
  }

  return (
    <div className="field-stack">
      <div className="object-details-header">
        <p className="object-details-name">{objectLabel(object)}</p>
        <HideButton object={object} name={objectLabel(object)} />
      </div>
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
      <FieldGroup title="Rotation" unit="°">
        {['X', 'Y', 'Z'].map((axis, index) => (
          <NumberField
            key={axis}
            compact
            label={axis}
            value={object.rotation[index] * DEGREES_PER_RADIAN}
            onChange={(degrees) => setRotation(index, degrees)}
            step={15}
            normalize={normalizeDegrees}
          />
        ))}
      </FieldGroup>
      {screen && (
        <NumberField
          label="Screen size"
          unit="in"
          value={object.screenInches}
          onChange={setScreenInches}
          min={screen.min}
          max={screen.max}
          step={1}
          normalize={limitInches}
        />
      )}
      <ColorField
        label="Color"
        value={object.color}
        onChange={(color) => updateObject(object.id, { color })}
      />
      <Button onClick={() => removeObject(object.id)}>Delete</Button>
    </div>
  )
}
