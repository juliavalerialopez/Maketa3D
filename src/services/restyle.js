// Browser side of the AI restyle (Part F, H.7): photo checks and resizing,
// and the requests to /api/restyle. Images are resized here so a request
// stays below Vercel's 4.5 MB body limit.
import { dataUrlParts } from './download'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const PHOTO_MAX_EDGE = 1024
const PHOTO_QUALITY = 0.8
const RENDER_WIDTH = 1280
const RENDER_HEIGHT = 720
const RENDER_QUALITY = 0.9
const ENDPOINT = '/api/restyle'
// Most reference photos per request, the room's included (api/restyle.js
// checks the same number).
export const MAX_PHOTOS = 8
// The request body must stay under this (the server refuses above 4 MB).
const BODY_BUDGET = 3_900_000
// When the body is over budget, the photos are made smaller: this scale per
// step, at this JPEG quality, at most this many steps.
const SHRINK_SCALE = 0.75
const SHRINK_QUALITY = 0.7
const SHRINK_STEPS = 3

export const MESSAGES = {
  photoType: 'Use a JPG, PNG or WebP image.',
  photoSize: 'The photo is larger than 10 MB.',
  photoRead: 'This file could not be read.',
  failed: 'The image could not be made. Try again.',
  timeout: 'The request took too long. Try again.',
  maxVersions: '6 versions is the maximum. Delete one to make room.',
  noPhoto: 'Add at least one reference photo.',
  tooLarge: 'The photos are too large to send together. Use fewer photos.',
}

// An error with a message for the panel, and the count (see countOf) when
// the server sent one.
export class RestyleError extends Error {
  constructor(message, count = null) {
    super(message)
    this.count = count
  }
}

// Draws `source` (an ImageBitmap or loaded <img>) into a width x height JPEG
// data URL, on white so transparent PNGs don't turn black.
function toJpeg(source, width, height, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

// Checks the file, then decodes and resizes it once (longest edge 1024 px,
// about 150 to 250 KB, so up to 8 photos fit in one request).
// Resolves { dataUrl, name }; rejects with a RestyleError for the panel.
export async function loadPhoto(file) {
  if (!PHOTO_TYPES.includes(file.type)) throw new RestyleError(MESSAGES.photoType)
  if (file.size > MAX_PHOTO_BYTES) throw new RestyleError(MESSAGES.photoSize)
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new RestyleError(MESSAGES.photoRead)
  }
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const dataUrl = toJpeg(bitmap, width, height, PHOTO_QUALITY)
  bitmap.close()
  return { dataUrl, name: file.name }
}

// A data URL as a loaded <img>.
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new RestyleError(MESSAGES.failed))
    image.src = dataUrl
  })
}

// The Room render (PNG data URL) as a 1280 x 720 JPEG data URL.
async function renderToJpeg(snapshot) {
  return toJpeg(await loadImage(snapshot), RENDER_WIDTH, RENDER_HEIGHT, RENDER_QUALITY)
}

// A photo (JPEG data URL) scaled down by `scale`, as a JPEG data URL.
async function shrinkPhoto(dataUrl, scale) {
  const image = await loadImage(dataUrl)
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  return toJpeg(image, width, height, SHRINK_QUALITY)
}

const base64Of = (dataUrl) => dataUrlParts(dataUrl).base64

// The panel message for a reached limit ('total' or 'visitor'), with the
// numbers from the server ({ visitorLimit, totalLimit }) when known.
export function limitMessage(limit, { visitorLimit, totalLimit } = {}) {
  if (limit === 'total') {
    const count = totalLimit ? ` (${totalLimit} images a day)` : ''
    return `Daily limit reached${count}. Try again tomorrow.`
  }
  const count = visitorLimit ? `${visitorLimit} ` : ''
  const noun = visitorLimit === 1 ? 'image' : 'images'
  return `You've used your ${count}${noun} for today. Try again tomorrow.`
}

const wholeOrNull = (value) => (Number.isInteger(value) && value >= 0 ? value : null)

// { remaining, limit, visitorLimit, totalLimit } from a server answer.
// remaining is null when unknown; limit is set only when remaining is 0;
// the two limits are null when the server did not send them.
function countOf(body) {
  const remaining = wholeOrNull(body?.remaining)
  return {
    remaining,
    limit: remaining === 0 ? (body.limit ?? 'visitor') : null,
    visitorLimit: wholeOrNull(body?.visitorLimit),
    totalLimit: wholeOrNull(body?.totalLimit),
  }
}

// What this visitor can still make today (see countOf).
export async function fetchRemaining() {
  try {
    const response = await fetch(ENDPOINT)
    if (!response.ok) return countOf(null)
    return countOf(await response.json())
  } catch {
    return countOf(null)
  }
}

function errorFor(status, body) {
  if (status === 429) {
    const count = { ...countOf(body), remaining: 0, limit: body?.limit === 'total' ? 'total' : 'visitor' }
    return new RestyleError(limitMessage(count.limit, count), count)
  }
  // A 504 can also come from Vercel itself, without a JSON body.
  if (status === 504) return new RestyleError(MESSAGES.timeout)
  if (status === 413) return new RestyleError(MESSAGES.tooLarge)
  return new RestyleError(MESSAGES.failed)
}

// The JSON body: the render, the room card and each object, with the photos
// as base64 JPEG. room: { mode, photo? }; objects: [{ id, type, name, mode,
// x, y, photo? }]; photo values here are data URLs.
function bodyFor(render, room, objects) {
  const withPhoto = ({ photo, ...rest }) => (photo ? { ...rest, photo: base64Of(photo) } : rest)
  return JSON.stringify({ render: base64Of(render), room: withPhoto(room), objects: objects.map(withPhoto) })
}

// The body, with the photos made smaller step by step while it is over
// budget. Rejects with tooLarge if it still does not fit.
async function fittingBody(render, room, objects) {
  let body = bodyFor(render, room, objects)
  for (let step = 0; body.length > BODY_BUDGET; step++) {
    if (step === SHRINK_STEPS) throw new RestyleError(MESSAGES.tooLarge)
    const shrink = async (item) => (item.photo ? { ...item, photo: await shrinkPhoto(item.photo, SHRINK_SCALE) } : item)
    room = await shrink(room)
    objects = await Promise.all(objects.map(shrink))
    body = bodyFor(render, room, objects)
  }
  return body
}

// Sends the Room render, the room card and the objects in the frame (see
// bodyFor). Resolves { image, count } (see countOf); rejects with a
// RestyleError for the panel.
export async function requestRestyle({ snapshot, room, objects }) {
  const render = await renderToJpeg(snapshot)
  const body = await fittingBody(render, room, objects)
  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  } catch {
    throw new RestyleError(MESSAGES.failed)
  }
  const answer = await response.json().catch(() => null)
  if (!response.ok || typeof answer?.image !== 'string') throw errorFor(response.status, answer)
  return { image: answer.image, count: countOf(answer) }
}
