// Live restyle prompt. Must match the latest version in docs/prompts/restyle.md.
// Images are sent in this order: 1 = Room render, 2 = reference photo.
export const PROMPT_VERSION = 'v1'

export const PROMPT = `Edit image 1. It is a plain 3D render of a room with one grey box-shaped sofa. Image 2 is a reference photo.
Make image 1 look like a real photograph of the same room, restyled to match image 2.

Keep exactly as in image 1:
- The camera: same viewpoint, height, angle, lens and framing. Do not rotate, zoom or move the view.
- The room: the same walls, corners and floor edges in the same places. Do not add windows, doors, beams, baseboards or openings.
- The sofa: the same place on the floor and the same orientation. It must be seen from the same side and at the same angle as the grey sofa. Do not turn it to face the camera.

Take from image 2:
- The sofa's design: shape, arms, legs, cushions, fabric, color and the pillows on it. Its size may follow the sofa in image 2, centered where the grey sofa is.
- The room's style: wall color and finish, floor material, light, time of day and mood.

Do not add anything else: no plants, rugs, shelves, wall slats, beams, artwork, lamps, tables, chairs or other furniture. Every object in the result must already be in image 1, except the sofa and the pillows on it.

Output one photorealistic 16:9 image.`

// T6 experiment (F.1.3): optional line about the white area outside the room,
// inserted before the last line.
export const WHITE_AREA_LINE = 'The white area outside the room is empty background; keep it plain.'

export function withWhiteAreaLine(prompt) {
  const lines = prompt.split('\n')
  lines.splice(lines.length - 1, 0, WHITE_AREA_LINE, '')
  return lines.join('\n')
}
