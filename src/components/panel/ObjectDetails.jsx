import { objectLabel } from '../objects/catalog'
import { useObjectsStore } from '../../store/objectsStore'
import { useRoomStore } from '../../store/roomStore'
import NumberField from '../ui/NumberField'

// How far the centre may move from the room centre along x and z so the
// object's rotated footprint stays inside the walls.
function positionLimits(object, room) {
  const cos = Math.abs(Math.cos(object.rotation))
  const sin = Math.abs(Math.sin(object.rotation))
  const halfX = (cos * object.size.width + sin * object.size.depth) / 2
  const halfZ = (sin * object.size.width + cos * object.size.depth) / 2
  return {
    x: Math.max(0, room.width / 2 - halfX),
    z: Math.max(0, room.depth / 2 - halfZ),
  }
}

// Fields for the selected object. ControlPanel remounts this per object,
// so every field starts from the newly selected object's values.
export default function ObjectDetails({ object }) {
  const updateObject = useObjectsStore((state) => state.updateObject)
  const room = useRoomStore((state) => state.room)

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
    </div>
  )
}
