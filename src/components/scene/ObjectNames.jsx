import { Html } from '@react-three/drei'
import { Color } from 'three'
import { useObjectsStore } from '../../store/objectsStore'
import { objectLabel } from '../objects/catalog'

// How much lighter or darker than the piece its name is, in lightness (0 to 1).
const NAME_CONTRAST = 0.45

// A variant of the piece's own color for its name, same hue: much darker on a
// light piece, much lighter on a dark one, so it reads on the piece.
function nameColor(hex) {
  const hsl = new Color(hex).getHSL({})
  const lightness = hsl.l > 0.5 ? Math.max(0.08, hsl.l - NAME_CONTRAST) : Math.min(0.94, hsl.l + NAME_CONTRAST)
  return `#${new Color().setHSL(hsl.h, hsl.s, lightness).getHexString()}`
}

// The name of every piece of furniture in Plan's 2D view (J.1.4), e.g.
// "Sofa 1", over the middle of its top, so a plan reads like a floor plan.
// HTML over the canvas, so it never shows in a Room render, and clicks go
// through it to the piece below. Only the 2D view mounts it (Scene.jsx).
export default function ObjectNames() {
  const objects = useObjectsStore((state) => state.objects)

  return objects.map((object) => {
    const [x, , z] = object.position
    return (
      <Html key={object.id} position={[x, object.size.height, z]} center style={{ pointerEvents: 'none' }}>
        <div
          className={object.hidden ? 'object-name object-name-faded' : 'object-name'}
          style={{ color: nameColor(object.color) }}
        >
          {objectLabel(object)}
        </div>
      </Html>
    )
  })
}
