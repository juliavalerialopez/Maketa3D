// Browser side of the AI restyle (Part F): photo checks and resizing, and the
// requests to /api/restyle. Images are resized here so a request stays far
// below Vercel's 4.5 MB body limit.
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const PHOTO_MAX_EDGE = 1536
const PHOTO_QUALITY = 0.85
const RENDER_WIDTH = 1280
const RENDER_HEIGHT = 720
const RENDER_QUALITY = 0.9
const ENDPOINT = '/api/restyle'

export const MESSAGES = {
  photoType: 'Use a JPG, PNG or WebP image.',
  photoSize: 'The photo is larger than 10 MB.',
  photoRead: 'This file could not be read.',
  failed: 'The image could not be made. Try again.',
  timeout: 'The request took too long. Try again.',
  maxVersions: '6 versions is the maximum. Delete one to make room.',
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

// Checks the file, then decodes and resizes it once (longest edge 1536 px).
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

// The Room render (PNG data URL) as a 1280 x 720 JPEG data URL.
function renderToJpeg(snapshot) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(toJpeg(image, RENDER_WIDTH, RENDER_HEIGHT, RENDER_QUALITY))
    image.onerror = () => reject(new RestyleError(MESSAGES.failed))
    image.src = snapshot
  })
}

const base64Of = (dataUrl) => dataUrl.slice(dataUrl.indexOf(',') + 1)

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
  return new RestyleError(MESSAGES.failed)
}

// Sends the Room render and the photo. Resolves { image, count } (see
// countOf); rejects with a RestyleError for the panel.
export async function requestRestyle(snapshot, photoDataUrl) {
  const render = await renderToJpeg(snapshot)
  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ render: base64Of(render), photo: base64Of(photoDataUrl) }),
    })
  } catch {
    throw new RestyleError(MESSAGES.failed)
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || typeof body?.image !== 'string') throw errorFor(response.status, body)
  return { image: body.image, count: countOf(body) }
}
