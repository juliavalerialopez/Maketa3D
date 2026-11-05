import { CAMERA_LIMITS, useCameraStore } from '../../store/cameraStore'
import { editGesture } from '../../store/historyStore'
import { normalizeDegrees, toDegrees, toRadians } from '../../store/roomBounds'
import NumberField from '../ui/NumberField'
import FieldGroup from '../ui/FieldGroup'

// Fields for the placeable camera (I.14), shown when "Camera" is selected:
// where it stands, its height, where it looks (pan around the vertical axis,
// tilt up or down) and its lens (vertical field of view of the 16:9 image).
// The Room render is taken from it. It has no Delete button: there is always
// one camera.
export default function CameraDetails() {
  const { position, pan, tilt, fov } = useCameraStore((state) => state.camera)
  const updateCamera = useCameraStore((state) => state.updateCamera)
  const [x, height, z] = position

  return (
    <div className="field-stack">
      <p className="object-details-name">Camera</p>
      <FieldGroup title="Location" unit="m">
        <NumberField
          compact
          label="X"
          value={x}
          onChange={(value) => updateCamera({ position: [value, height, z] })}
          {...editGesture}
          min={CAMERA_LIMITS.x[0]}
          max={CAMERA_LIMITS.x[1]}
        />
        <NumberField
          compact
          label="Z"
          value={z}
          onChange={(value) => updateCamera({ position: [x, height, value] })}
          {...editGesture}
          min={CAMERA_LIMITS.z[0]}
          max={CAMERA_LIMITS.z[1]}
        />
      </FieldGroup>
      <NumberField
        label="Height"
        unit="m"
        value={height}
        onChange={(value) => updateCamera({ position: [x, value, z] })}
        {...editGesture}
        min={CAMERA_LIMITS.height[0]}
        max={CAMERA_LIMITS.height[1]}
      />
      <FieldGroup title="View" unit="°">
        <NumberField
          compact
          label="Pan"
          value={toDegrees(pan)}
          onChange={(degrees) => updateCamera({ pan: toRadians(degrees) })}
          {...editGesture}
          step={15}
          normalize={normalizeDegrees}
        />
        <NumberField
          compact
          label="Tilt"
          value={toDegrees(tilt)}
          onChange={(degrees) => updateCamera({ tilt: toRadians(degrees) })}
          {...editGesture}
          step={5}
          min={CAMERA_LIMITS.tilt[0]}
          max={CAMERA_LIMITS.tilt[1]}
        />
      </FieldGroup>
      <NumberField
        label="Lens"
        unit="°"
        value={fov}
        onChange={(value) => updateCamera({ fov: value })}
        {...editGesture}
        step={5}
        min={CAMERA_LIMITS.fov[0]}
        max={CAMERA_LIMITS.fov[1]}
      />
    </div>
  )
}
