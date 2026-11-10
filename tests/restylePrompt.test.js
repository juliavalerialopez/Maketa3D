import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPrompt,
  promptImages,
  roomOnlyLine,
  WALL_SHADES_LINE,
  withWallShadesLine,
} from '../api/_restyle-prompt.js'

const objects = [
  { name: 'Sofa 1', mode: 'reference', x: 30, y: 60, photo: 'sofa' },
  { name: 'Coffee table 1', mode: 'creative', x: 50, y: 70 },
  { name: 'Armchair 2', mode: 'reference', x: 70, y: 60, photo: 'armchair' },
]

test('images go render, room photo, then object photos in list order', () => {
  const images = promptImages({ render: 'render', room: { mode: 'reference', photo: 'room' }, objects })
  assert.deepEqual(
    images.map((image) => image.data),
    ['render', 'room', 'sofa', 'armchair'],
  )
  assert.ok(images.every((image) => image.mimeType === 'image/jpeg'))
})

test('the prompt numbers the images in the same order', () => {
  const prompt = buildPrompt({ room: { mode: 'reference', photo: 'room' }, objects })
  assert.match(prompt, /Image 2 is the room reference/)
  assert.match(prompt, /Sofa 1 \(a sofa\)[^\n]*\n {2}Image 3 is its reference/)
  assert.match(prompt, /Armchair 2 \(an armchair\)[^\n]*\n {2}Image 4 is its reference/)
  assert.match(prompt, /Coffee table 1 \(a coffee table\)[^\n]*\n {2}No reference/)
})

test('the wall-shades line (I.15 test only) goes before the last line, and the live prompt has none', () => {
  const prompt = buildPrompt({ room: { mode: 'creative' }, objects })
  assert.ok(!prompt.includes(WALL_SHADES_LINE))
  const lines = withWallShadesLine(prompt).split('\n')
  assert.equal(lines.at(-1), prompt.split('\n').at(-1))
  assert.equal(lines.at(-3), WALL_SHADES_LINE)
})

test('without a room photo the first object photo is image 2', () => {
  const prompt = buildPrompt({ room: { mode: 'creative' }, objects })
  assert.doesNotMatch(prompt, /room reference/)
  assert.match(prompt, /Sofa 1[^\n]*\n {2}Image 2 is its reference/)
  assert.match(prompt, /Armchair 2[^\n]*\n {2}Image 3 is its reference/)
})

test('the live prompt (v7) has the room-only line, naming the object photos, before the last line', () => {
  const input = { room: { mode: 'reference', photo: 'room' }, objects }
  const line = roomOnlyLine(input)
  assert.match(line, /^Only image 2 sets the walls, floor and light\. Images 3 and 4 are for the furniture only/)
  const lines = buildPrompt(input).split('\n')
  assert.equal(lines.at(-1), 'Output one photorealistic 16:9 image.')
  assert.equal(lines.at(-3), line)
})

test('the room-only line uses one image in the singular', () => {
  const line = roomOnlyLine({ room: { mode: 'reference', photo: 'room' }, objects: objects.slice(0, 2) })
  assert.match(line, /Image 3 is for the furniture only: take no wall color[^:]*from it, even when it shows/)
})

test('the room-only line lists three or more object photos with commas', () => {
  const more = [...objects, { name: 'Bookshelf 1', mode: 'reference', x: 90, y: 40, photo: 'shelf' }]
  const line = roomOnlyLine({ room: { mode: 'reference', photo: 'room' }, objects: more })
  assert.match(line, /Images 3, 4 and 5 are for the furniture only/)
})

test('without a room photo or an object photo there is no room-only line', () => {
  const room = { mode: 'reference', photo: 'room' }
  assert.equal(roomOnlyLine({ room: { mode: 'creative' }, objects }), null)
  assert.equal(roomOnlyLine({ room, objects: [objects[1]] }), null)
  assert.doesNotMatch(buildPrompt({ room, objects: [objects[1]] }), /Only image 2 sets/)
  assert.doesNotMatch(buildPrompt({ room: { mode: 'creative' }, objects }), /Only image 2 sets/)
})
