import { useEffect, useMemo } from 'react'
import { BoxGeometry, EdgesGeometry } from 'three'
import { selectSelectedObject, useObjectsStore } from '../../store/objectsStore'
import { objectTransform } from '../../store/roomBounds'
import { useUiStore } from '../../store/uiStore'

const PADDING = 0.02

// The --selection color of a theme (src/index.css), read once per theme.
// data-theme is already set when the store's theme changes.
const colors = {}
function selectionColor(theme) {
  colors[theme] ??= getComputedStyle(document.documentElement).getPropertyValue('--selection').trim()
  return colors[theme]
}

// Wireframe box around the selected object, following its size, position and rotation.
export default function SelectionBox() {
  const selected = useObjectsStore(selectSelectedObject)
  const color = selectionColor(useUiStore((state) => state.theme))

  const width = selected?.size.width
  const depth = selected?.size.depth
  const height = selected?.size.height

  const geometry = useMemo(() => {
    if (width === undefined) return null
    const box = new BoxGeometry(width + 2 * PADDING, height + 2 * PADDING, depth + 2 * PADDING)
    const edges = new EdgesGeometry(box)
    box.dispose()
    return edges
  }, [width, depth, height])

  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!selected) return null

  const { position, rotation } = objectTransform(selected)
  return (
    // A helper: hidden in the snapshot.
    <group position={position} rotation={rotation} userData={{ helper: true }}>
      <lineSegments geometry={geometry} position={[0, height / 2, 0]}>
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  )
}
