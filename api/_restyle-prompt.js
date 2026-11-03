// Live restyle prompt. Must match the latest version in docs/prompts/restyle.md.
// v2 (H.7): built per request from the Reference Room card and the objects.
// Images are sent in this order: 1 = Room render, then the room photo (if the
// room is in Reference mode), then the object photos in list order.
export const PROMPT_VERSION = 'v2'

// The kind of item from its list name: "Coffee table 2" -> "coffee table".
const kindOf = (name) => name.replace(/\s+\d+$/, '').toLowerCase()
// "a sofa", "an armchair".
const withArticle = (kind) => (/^[aeiou]/.test(kind) ? `an ${kind}` : `a ${kind}`)

// room: { mode, photo? }; objects: [{ name, mode, x, y, photo? }] (x and y in
// percent of the image from the left and from the top). Returns the prompt
// text; image numbers follow the order above.
export function buildPrompt({ room, objects }) {
  let nextImage = 2
  const roomImage = room.photo ? nextImage++ : null

  const roomLines = roomImage
    ? [
        `Image ${roomImage} is the room reference. Take only the wall color and finish, the floor material, the light, the time of day and the mood from it.`,
        `Ignore all furniture, objects and decor in image ${roomImage}.`,
      ]
    : ['Choose a wall color and finish, a floor material and a light that suit the furniture below.']

  const objectLines = objects.map((object) => {
    const kind = kindOf(object.name)
    const where = `${object.name} (${withArticle(kind)}): its grey shape is centered at ${object.x}% from the left and ${object.y}% from the top of image 1.`
    if (object.photo) {
      const image = nextImage++
      return [
        `- ${where}`,
        `  Image ${image} is its reference. Replace the grey shape with the ${kind} from image ${image} only: its design, shape, legs, fabric or material and color.`,
        `  Ignore everything else in image ${image}: other furniture, walls, floor, plants and decor.`,
      ].join('\n')
    }
    return [
      `- ${where}`,
      `  No reference: replace the grey shape with a realistic ${kind} in a style that fits the room and the other pieces.`,
    ].join('\n')
  })

  return `Edit image 1. It is a plain 3D render of a room. The grey box shapes in it are placeholder furniture.
Make image 1 look like a real photograph of the same room, with real furniture in place of the grey shapes.

Keep exactly as in image 1:
- The camera: same viewpoint, height, angle, lens and framing. Do not rotate, zoom or move the view.
- The room: the same walls, corners and floor edges in the same places. Do not add windows, doors, beams, baseboards or openings.
- Every piece of furniture listed below: the same place on the floor, the same size and the same orientation as its grey shape. Each must be seen from the same side and at the same angle. Do not turn any piece to face the camera.

The room (walls, floor, light):
${roomLines.join('\n')}

The furniture:
${objectLines.join('\n')}

Do not add anything else: no plants, rugs, shelves, wall slats, beams, artwork, lamps, tables, chairs or other furniture. Every object in the result must be one of the pieces listed above.

Output one photorealistic 16:9 image.`
}

// Part F prompt (v1), one reference photo for the sofa and the room. Kept for
// the prompt spike script until H.8 moves it to v2.
export const PROMPT_V1 = `Edit image 1. It is a plain 3D render of a room with one grey box-shaped sofa. Image 2 is a reference photo.
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
