import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'

// Inside the Plan Canvas: when the browser drops the WebGL context (GPU reset,
// too many 3D pages), the scene can no longer draw. This throws on the next
// render, and the Canvas passes the error on to the ErrorBoundary around it
// (I.3), which shows the error screen instead of a frozen scene.
export default function ContextLossGuard() {
  const gl = useThree((state) => state.gl)
  const [lost, setLost] = useState(false)

  useEffect(() => {
    const canvas = gl.domElement
    const handleLost = () => setLost(true)
    canvas.addEventListener('webglcontextlost', handleLost)
    return () => canvas.removeEventListener('webglcontextlost', handleLost)
  }, [gl])

  if (lost) throw new Error('The WebGL context was lost.')
  return null
}
