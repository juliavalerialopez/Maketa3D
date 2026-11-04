import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPrompt, promptImages } from '../api/_restyle-prompt.js'

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

test('without a room photo the first object photo is image 2', () => {
  const prompt = buildPrompt({ room: { mode: 'creative' }, objects })
  assert.doesNotMatch(prompt, /room reference/)
  assert.match(prompt, /Sofa 1[^\n]*\n {2}Image 2 is its reference/)
  assert.match(prompt, /Armchair 2[^\n]*\n {2}Image 3 is its reference/)
})
