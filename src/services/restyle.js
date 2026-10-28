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
  visitorLimit: "You've used your 3 images for today. Try again tomorrow.",
  totalLimit: 'Daily limit reached (20 images a day). Try again tomorrow.',
  failed: 'The image could not be made. Try again.',
  timeout: 'The request took too long. Try again.',
}

// An error with a message for the panel, and the remaining count when the
// server sent one.
export class RestyleError extends Error {
  constructor(message, remaining) {
    super(message)
    this.remaining = remaining
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

// What this visitor can still make today, or null when unknown.
export async function fetchRemaining() {
  try {
    const response = await fetch(ENDPOINT)
    if (!response.ok) return null
    const { remaining } = await response.json()
    return Number.isInteger(remaining) ? remaining : null
  } catch {
    return null
  }
}

function errorFor(status, body) {
  const remaining = Number.isInteger(body?.remaining) ? body.remaining : undefined
  if (status === 429) {
    return new RestyleError(body?.limit === 'total' ? MESSAGES.totalLimit : MESSAGES.visitorLimit, remaining ?? 0)
  }
  if (status === 504) return new RestyleError(MESSAGES.timeout, remaining)
  return new RestyleError(MESSAGES.failed, remaining)
}

// Sends the Room render and the photo. Resolves { image, remaining }
// (remaining may be null); rejects with a RestyleError for the panel.
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
  return { image: body.image, remaining: Number.isInteger(body.remaining) ? body.remaining : null }
}
