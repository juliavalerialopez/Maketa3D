// Restyle function (Part F): POST { render, photo } (base64 JPEG) returns
// { image, remaining } with the AI image as a data URL. GET returns
// { remaining } without counting. Errors are { error: code }:
// 400 bad_input, 413 too_large, 502 failed, 504 timeout.
// The Gemini key stays here; photos and results are never stored or logged.
import { restyleImage } from './_gemini.js'
import { PROMPT } from './_restyle-prompt.js'

// Vercel allows 4.5 MB per request body; the browser sends about 1.5 MB.
const MAX_BODY = 4_000_000
// Own limit on the Gemini call, well below Vercel's 300 s.
const TIMEOUT_MS = 60_000
const MOCK_DELAY_MS = 2_000
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

const fail = (status, error) => Response.json({ error }, { status })

function isJpegBase64(value) {
  if (typeof value !== 'string' || value.length < 16 || !BASE64.test(value)) return false
  const head = Buffer.from(value.slice(0, 8), 'base64')
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
}

// The checked { render, photo }, or { error: Response }.
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
  if (!isJpegBase64(body?.render) || !isJpegBase64(body?.photo)) return { error: fail(400, 'bad_input') }
  return { render: body.render, photo: body.photo }
}

export async function GET() {
  return Response.json({ remaining: null })
}

export async function POST(request) {
  const input = await readInput(request)
  if (input.error) return input.error

  // Local only: echo the render back, no AI call and no counting.
  if (process.env.RESTYLE_MOCK === '1') {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
    return Response.json({ image: `data:image/jpeg;base64,${input.render}`, remaining: null })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('Restyle: GEMINI_API_KEY is not set')
    return fail(502, 'failed')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const result = await restyleImage({
      apiKey,
      prompt: PROMPT,
      render: { data: input.render, mimeType: 'image/jpeg' },
      photo: { data: input.photo, mimeType: 'image/jpeg' },
      signal: controller.signal,
    })
    return Response.json({ image: `data:${result.mimeType};base64,${result.data}`, remaining: null })
  } catch (error) {
    if (error.name === 'AbortError') return fail(504, 'timeout')
    console.error('Restyle: Gemini call failed:', error.message, error.detail ?? '')
    return fail(502, 'failed')
  } finally {
    clearTimeout(timer)
  }
}
