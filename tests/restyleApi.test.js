import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { POST } from '../api/restyle.js'
import { MAX_BODY, MAX_PHOTOS } from '../shared/restyle.js'

// Mock mode (RESTYLE_MOCK=1): the function checks the request and echoes the
// render back, with no Gemini call and no counting. Bad requests are refused
// before that point, so these tests never reach Gemini or Upstash.
before(() => {
  process.env.RESTYLE_MOCK = '1'
})
after(() => {
  delete process.env.RESTYLE_MOCK
})

// The start of a JPEG file, as base64 (the server checks the first bytes).
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 12 }, () => 0)]).toString('base64')
const object = (index) => ({ id: `id-${index}`, type: 'sofa', name: `Sofa ${index}`, mode: 'reference', x: 50, y: 50, photo: jpeg })

const post = (body) =>
  POST(new Request('http://localhost/api/restyle', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }))

test('a valid request, with or without a facing, is answered with the image', async () => {
  const objects = [object(1), { ...object(2), mode: 'creative', photo: undefined, facing: 'front-left' }]
  const response = await post({ render: jpeg, room: { mode: 'reference', photo: jpeg }, objects })
  assert.equal(response.status, 200)
  const answer = await response.json()
  assert.equal(answer.image, `data:image/jpeg;base64,${jpeg}`)
})

test(`more than ${MAX_PHOTOS} photos are refused`, async () => {
  const objects = Array.from({ length: MAX_PHOTOS }, (_, index) => object(index + 1))
  const response = await post({ render: jpeg, room: { mode: 'reference', photo: jpeg }, objects })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'bad_input')
})

test('an unknown facing is refused', async () => {
  for (const facing of ['up', '', null, 3]) {
    const response = await post({ render: jpeg, room: { mode: 'creative' }, objects: [{ ...object(1), facing }] })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'bad_input')
  }
})

test('a body over the size limit is refused', async () => {
  const response = await post('x'.repeat(MAX_BODY + 1))
  assert.equal(response.status, 413)
  assert.equal((await response.json()).error, 'too_large')
})

test('a request without any photo is refused', async () => {
  const response = await post({ render: jpeg, room: { mode: 'creative' }, objects: [{ ...object(1), mode: 'creative', photo: undefined }] })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'bad_input')
})
