// Gemini image edit call, shared by the restyle function and the prompt spike
// script. Plain fetch, no SDK. The key is passed in and never logged.
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
export const MODEL = 'gemini-nano-banana-2.1'

export class GeminiError extends Error {
  constructor(status, detail) {
    super(`Gemini request failed (${status})`)
    this.status = status
    this.detail = detail
  }
}

// The last image block anywhere in the response (the model's output steps).
function lastImage(value) {
  let found = null
  const visit = (node) => {
    if (Array.isArray(node)) node.forEach(visit)
    else if (node && typeof node === 'object') {
      if (node.type === 'image' && typeof node.data === 'string') found = node
      Object.values(node).forEach(visit)
    }
  }
  visit(value)
  return found
}

// render and photo: { data: base64, mimeType }. Returns { data, mimeType }
// of the generated 1K 16:9 image. Throws GeminiError, or an AbortError when
// `signal` aborts.
export async function restyleImage({ apiKey, prompt, render, photo, signal }) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { type: 'text', text: prompt },
        { type: 'image', mime_type: render.mimeType, data: render.data },
        { type: 'image', mime_type: photo.mimeType, data: photo.data },
      ],
      response_format: { type: 'image', aspect_ratio: '16:9', image_size: '1K' },
    }),
    signal,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new GeminiError(response.status, detail.slice(0, 500))
  }

  const image = lastImage(await response.json())
  if (!image) throw new GeminiError(502, 'No image in the response')
  return { data: image.data, mimeType: image.mime_type ?? image.mimeType ?? 'image/png' }
}
