// Restyle function (Part F, H.7): POST { render, room, objects } returns
// { image, remaining } with the AI image as a data URL. render is a base64
// JPEG; room is { mode, photo? }; objects is [{ id, type, name, mode, x, y,
// photo? }] (see readInput); photos are base64 JPEG. GET returns
// { remaining } without counting. When remaining is 0, `limit` says which
// limit was reached ('total' | 'visitor'). Every answer also carries the
// current limits, visitorLimit and totalLimit (H.1). Errors are { error: code }:
// 400 bad_input, 413 too_large, 429 limit (with limit: 'total' | 'visitor'),
// 502 failed, 504 timeout.
// The Gemini key stays here; photos and results are never stored or logged.
import { restyleImage } from './_gemini.js'
import { limits, release, remaining, reserve } from './_limits.js'
import { buildPrompt, promptImages } from './_restyle-prompt.js'
// Limits shared with the browser (I.8).
import { MAX_BODY, MAX_OBJECTS, MAX_PHOTOS } from '../shared/restyle.js'

const MODES = ['reference', 'creative']
const ID = /^[A-Za-z0-9-]{1,64}$/
const TYPE = /^[A-Za-z]{1,30}$/
// List names like "Coffee table 2": letters, digits and spaces only, since
// they go into the prompt.
const NAME = /^[A-Za-z][A-Za-z0-9 ]{0,39}$/
// Own limit on the Gemini call, well below Vercel's 300 s.
const TIMEOUT_MS = 60_000
const MOCK_DELAY_MS = 2_000
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

// Every answer carries the current limits, so the page can show them.
const reply = (body, init) => Response.json({ ...body, ...limits() }, init)
const fail = (status, error, extra) => reply({ error, ...extra }, { status })
const isMock = () => process.env.RESTYLE_MOCK === '1'

function isJpegBase64(value) {
  if (typeof value !== 'string' || value.length < 16 || !BASE64.test(value)) return false
  const head = Buffer.from(value.slice(0, 8), 'base64')
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
}

const isPercent = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100

// A card's photo is required in Reference mode and not allowed in Creative.
function isValidCard(card) {
  if (!card || typeof card !== 'object' || !MODES.includes(card.mode)) return false
  return card.mode === 'reference' ? isJpegBase64(card.photo) : card.photo === undefined
}

function isValidObject(object) {
  return (
    isValidCard(object) &&
    ID.test(object.id ?? '') &&
    TYPE.test(object.type ?? '') &&
    NAME.test(object.name ?? '') &&
    isPercent(object.x) &&
    isPercent(object.y)
  )
}

// The checked { render, room, objects }, or { error: Response }. At least
// one photo (H.6.1) and at most MAX_PHOTOS.
async function readInput(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY) return { error: fail(413, 'too_large') }
  const text = await request.text()
  if (text.length > MAX_BODY) return { error: fail(413, 'too_large') }
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return { error: fail(400, 'bad_input') }
  }
  const { render, room, objects } = body ?? {}
  const valid =
    isJpegBase64(render) &&
    isValidCard(room) &&
    Array.isArray(objects) &&
    objects.length <= MAX_OBJECTS &&
    objects.every(isValidObject)
  if (!valid) return { error: fail(400, 'bad_input') }
  const photos = [room, ...objects].filter((card) => card.photo).length
  if (photos < 1 || photos > MAX_PHOTOS) return { error: fail(400, 'bad_input') }
  return { render, room, objects }
}

export async function GET(request) {
  if (isMock()) return reply({ remaining: null })
  try {
    return reply(await remaining(request))
  } catch (error) {
    console.error('Restyle: could not read the limits:', error.message)
    return reply({ remaining: null })
  }
}

export async function POST(request) {
  const input = await readInput(request)
  if (input.error) return input.error

  // Local only: echo the render back, no AI call and no counting.
  if (isMock()) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
    return reply({ image: `data:image/jpeg;base64,${input.render}`, remaining: null })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('Restyle: GEMINI_API_KEY is not set')
    return fail(502, 'failed')
  }

  // Count first, so the limits hold even with requests running in parallel.
  let reservation
  try {
    reservation = await reserve(request)
  } catch (error) {
    console.error('Restyle: could not count the generation:', error.message)
    return fail(502, 'failed')
  }
  if (!reservation.ok) return fail(429, 'limit', { limit: reservation.limit, remaining: 0 })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const result = await restyleImage({
      apiKey,
      prompt: buildPrompt(input),
      images: promptImages(input),
      signal: controller.signal,
    })
    return reply({
      image: `data:${result.mimeType};base64,${result.data}`,
      remaining: reservation.remaining,
      limit: reservation.limit,
    })
  } catch (error) {
    // Failed tries are not counted.
    await release(reservation.keys).catch((releaseError) =>
      console.error('Restyle: could not undo the count:', releaseError.message),
    )
    if (error.name === 'AbortError') return fail(504, 'timeout')
    console.error('Restyle: Gemini call failed:', error.message, error.detail ?? '')
    return fail(502, 'failed')
  } finally {
    clearTimeout(timer)
  }
}
