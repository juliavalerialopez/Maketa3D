// Live restyle prompt. Must match the latest version in docs/prompts/restyle.md.
// v12 (J.11.2): v3 (H.8), built per request from the Reference Room card and
// the objects, plus the room-only line (v7) and the plain-walls line (v8) when
// there is a room photo and an object photo, plus which way each piece with a
// front faces (v9), plus the doors and windows of the Room render with their
// rectangles (v10), plus the style of each door or window taken from its own
// photo when it has one (v12; v11 was tried and not kept). Images are sent in
// this order: 1 = Room render, then the room photo (if the room is in
// Reference mode), then the object photos in list order, then the door and
// window photos.
export const PROMPT_VERSION = 'v12'

// The kind of item from its list name: "Coffee table 2" -> "coffee table".
const kindOf = (name) => name.replace(/\s+\d+$/, '').toLowerCase()
// "a sofa", "an armchair".
const withArticle = (kind) => (/^[aeiou]/.test(kind) ? `an ${kind}` : `a ${kind}`)

// The images in the order the prompt names them: the render, the room photo,
// the object photos in list order, then the door and window photos (v12).
// Shared by /api/restyle and the prompt test script. render and photos are
// base64 JPEG.
export function promptImages({ render, room, objects, openings = [] }) {
  const jpeg = (data) => ({ data, mimeType: 'image/jpeg' })
  const photos = [room, ...objects, ...openings].filter((card) => card.photo).map((card) => jpeg(card.photo))
  return [jpeg(render), ...photos]
}

// v9 facing sentences (I.19): which way a piece's front faces in image 1, by
// the request's `facing` (one of FACINGS in shared/restyle.js). The grey
// shapes' front and back look alike, so without this the model guesses.
const FACING_SENTENCES = {
  front: 'Its front faces the camera.',
  'front-right': 'Its front faces the camera, turned toward the right of the image.',
  right: 'Its front faces the right of the image; the camera sees it from the side.',
  'back-right': 'Its front faces away from the camera, toward the right of the image; the camera sees mostly its back.',
  back: 'Its back faces the camera.',
  'back-left': 'Its front faces away from the camera, toward the left of the image; the camera sees mostly its back.',
  left: 'Its front faces the left of the image; the camera sees it from the side.',
  'front-left': 'Its front faces the camera, turned toward the left of the image.',
}

export const facingSentence = (facing) => FACING_SENTENCES[facing] ?? null

// v10 (J.11.1): the doors and windows in image 1, each with the rectangle it
// covers, so they become real ones of the same size at the same place. The
// render shows a door as a flat brown rectangle and a window as a pale blue
// one. `roomImage` is the room photo's image number, or null; `takeImage()`
// gives the next free image number. v12 (J.11.2): an opening with a photo gets
// a reference line that takes only the style from it. Empty with no openings.
function openingsPart(openings, roomImage, takeImage) {
  if (openings.length === 0) return ''
  const fromPhoto = roomImage
    ? ` Image ${roomImage} may show doors and windows too: take only their style from it (frame, color, glazing), never their number, size or place.`
    : ''
  const lines = openings.map((opening) => {
    const where = `- ${opening.name} (${withArticle(opening.type)}): its rectangle spans from ${opening.left}% to ${opening.right}% from the left and from ${opening.top}% to ${opening.bottom}% from the top of image 1.`
    if (!opening.photo) return where
    const image = takeImage()
    return [
      where,
      `  Image ${image} is its reference. Take only the style of the ${opening.type} from image ${image}: its frame, material, color, glazing or panels and handle. Its size and place stay those of its rectangle.`,
      `  Ignore everything else in image ${image}: other doors and windows, walls, floor and furniture.`,
    ].join('\n')
  })
  return `The doors and windows:
The flat colored rectangles on the walls of image 1 are placeholders: a brown one is a door, a pale blue one is a window. Make each a real door or window that fills its rectangle exactly: on the same wall, at the same place, with the same width and height. Do not move, resize, add or remove any.${fromPhoto}
${lines.join('\n')}

`
}

// room: { mode, photo? }; objects: [{ name, mode, x, y, facing?, photo? }] (x
// and y in percent of the image from the left and from the top); openings:
// [{ type, name, left, right, top, bottom, photo? }] (percent, J.11.1).
// Returns the prompt text; image numbers follow the order above.
export function buildPrompt({ room, objects, openings = [] }) {
  let nextImage = 2
  const roomImage = room.photo ? nextImage++ : null
  // The doors and windows of image 1 are the only ones allowed.
  const noOpenings = openings.length
    ? 'Do not add windows, doors, beams, baseboards or openings other than the doors and windows listed below.'
    : 'Do not add windows, doors, beams, baseboards or openings.'

  const roomLines = roomImage
    ? [
        `Image ${roomImage} is the room reference. Restyle the walls and floor of image 1 to match it: the wall color, the wall finish with any paneling, wainscoting or moldings, the floor material and color, the light, the time of day and the mood.`,
        `These replace the plain grey walls and floor of image 1; only their shape and position stay.`,
        `Ignore all furniture, objects and decor in image ${roomImage}.`,
      ]
    : ['Choose a wall color and finish, a floor material and a light that suit the furniture below.']

  const objectLines = objects.map((object) => {
    const kind = kindOf(object.name)
    const facing = facingSentence(object.facing)
    const where = `${object.name} (${withArticle(kind)}): its grey shape is centered at ${object.x}% from the left and ${object.y}% from the top of image 1.${facing ? ` ${facing}` : ''}`
    if (object.photo) {
      const image = nextImage++
      return [
        `- ${where}`,
        `  Image ${image} is its reference. Replace the grey shape with the ${kind} from image ${image} only, in its own form: its outline (round, square, L-shaped, with or without a chaise), arms, legs, fabric or material and color. Do not reshape it to fit the grey shape.`,
        `  Ignore everything else in image ${image}: other furniture, walls, floor, plants and decor.`,
      ].join('\n')
    }
    return [
      `- ${where}`,
      `  No reference: replace the grey shape with a realistic ${kind} in a style that fits the room and the other pieces.`,
    ].join('\n')
  })

  const prompt = `Edit image 1. It is a plain 3D render of a room. The grey box shapes in it are placeholder furniture.
Make image 1 look like a real photograph of the same room, with real furniture in place of the grey shapes.

Keep exactly as in image 1:
- The camera: same viewpoint, height, angle, lens and framing. Do not rotate, zoom or move the view. The result must line up with image 1 when laid over it: every wall corner and floor edge stays at the same place in the frame.
- The room's shape: the same walls, corners and floor edges. ${noOpenings}
- Every piece of furniture listed below: the same place on the floor, about the same size, and the same orientation as its grey shape. Each must be seen from the same side and at the same angle. Do not turn any piece to face the camera.

The grey shapes only mark where each piece stands, how big it is and which way it faces; they are not its design. A piece with a reference photo takes its form from that photo, even when it differs from the grey shape (for example a round table on a rectangular shape, or a sofa with a chaise on a straight shape).

The room (walls, floor, light):
${roomLines.join('\n')}

${openingsPart(openings, roomImage, () => nextImage++)}The furniture:
${objectLines.join('\n')}

Do not add anything else: no plants, rugs, shelves, wall slats, beams, artwork, lamps, tables, chairs or other furniture. Every object in the result must be one of the pieces listed above.

Output one photorealistic 16:9 image.`

  const line = roomOnlyLine({ room, objects })
  return line ? withLineBeforeLast(withLineBeforeLast(prompt, line), PLAIN_WALLS_LINE) : prompt
}

// T6 experiment (Part F): optional line about the white area outside the
// room, inserted before the last line. Used only by scripts/try-restyle.mjs.
export const WHITE_AREA_LINE = 'The white area outside the room is empty background; keep it plain.'

export function withWhiteAreaLine(prompt) {
  return withLineBeforeLast(prompt, WHITE_AREA_LINE)
}

// I.15 wall-shades test (v6 candidate, not live): the Room render gives each
// wall its own clearly different light shade, so the corners are easy to see.
// This line tells the model the shades only mark the corners. Used only by
// scripts/try-restyle.mjs --shades.
export const WALL_SHADES_LINE =
  'The walls of image 1 have different light shades only to show where the corners are. Keep every corner exactly where it is, and give all walls the same finish.'

export function withWallShadesLine(prompt) {
  return withLineBeforeLast(prompt, WALL_SHADES_LINE)
}

// "Image 3", "Images 3 and 4", "Images 3, 4 and 5".
function imageList(numbers) {
  if (numbers.length === 1) return `Image ${numbers[0]}`
  return `Images ${numbers.slice(0, -1).join(', ')} and ${numbers.at(-1)}`
}

// v7 room-only line (I.18): a strong object photo can take over the walls and
// floor, so this repeats at the end that only the room photo sets them. Null
// when there is no room photo or no object photo (nothing to choose between).
// Same image numbers as buildPrompt.
export function roomOnlyLine({ room, objects }) {
  if (!room.photo) return null
  const count = objects.filter((object) => object.photo).length
  if (count === 0) return null
  const objectImages = imageList(Array.from({ length: count }, (_, i) => i + 3))
  const verb = count === 1 ? 'is' : 'are'
  return `Only image 2 sets the walls, floor and light. ${objectImages} ${verb} for the furniture only: take no wall color, wall finish, floor, rug or light from ${count === 1 ? 'it' : 'them'}, even when ${count === 1 ? 'it shows' : 'they show'} a strong room.`
}

// v8 plain-walls line (I.18.3): an object photo's paneling can still end up on
// plain walls, so this says plain walls stay plain. Added after the room-only
// line, so only with a room photo and an object photo.
export const PLAIN_WALLS_LINE =
  'If image 2 has plain walls, keep them plain: take no paneling, wainscoting or moldings from the other images.'

function withLineBeforeLast(prompt, line) {
  const lines = prompt.split('\n')
  lines.splice(lines.length - 1, 0, line, '')
  return lines.join('\n')
}
