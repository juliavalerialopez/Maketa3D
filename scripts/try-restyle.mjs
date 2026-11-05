// Prompt test (Part F, H.8): sends one test case to Gemini with the live
// prompt (buildPrompt, PROMPT_VERSION) and saves the results. Same prompt and image order
// as /api/restyle, with no limits and no counting.
//
//   node --env-file=.env.local scripts/try-restyle.mjs <case.json> [--white] [--shades] [--runs N]
//
// case.json is either a test case written by hand, with image paths relative
// to the JSON file:
//   {
//     "render": "fixture-two-sofas.png",
//     "room": { "mode": "reference", "photo": "room.jpg" },
//     "objects": [
//       { "name": "Sofa 1", "x": 30, "y": 62, "mode": "reference", "photo": "sofa-with-table.jpg" },
//       { "name": "Coffee table 1", "x": 52, "y": 70, "mode": "creative" }
//     ]
//   }
// or a request body copied from the app (DevTools, Network, the restyle
// request, Payload), where render and photos are base64 JPEG. Positions (x, y)
// are percent from the left and top of the render; the app's request shows them.
//
// --white  adds the T6 white-area line to the prompt
// --shades adds the I.15 wall-shades line, the v6 candidate (for renders taken
//          with ?wallShades, see docs/prompts/restyle.md, "Wall shades test")
// --runs   number of runs (default 3, the pass rule needs 2 of 3)
// Results go to scratch/restyle-runs/ (gitignored), with the prompt as a .txt.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { restyleImage, MODEL } from '../api/_gemini.js'
import {
  buildPrompt,
  promptImages,
  PROMPT_VERSION,
  withWallShadesLine,
  withWhiteAreaLine,
} from '../api/_restyle-prompt.js'

const MIME_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
const OUT_DIR = 'scratch/restyle-runs'

function usage(message) {
  console.error(message)
  console.error('Usage: node --env-file=.env.local scripts/try-restyle.mjs <case.json> [--white] [--shades] [--runs N]')
  process.exit(1)
}

const args = process.argv.slice(2)
const white = args.includes('--white')
const shades = args.includes('--shades')
const runsIndex = args.indexOf('--runs')
const runs = runsIndex >= 0 ? Number(args[runsIndex + 1]) : 3
const [casePath] = args.filter((arg, i) => !arg.startsWith('--') && !(runsIndex >= 0 && i === runsIndex + 1))

if (!process.env.GEMINI_API_KEY) usage('GEMINI_API_KEY is not set (put it in .env.local).')
if (!casePath) usage('Give a test case (JSON).')
if (!Number.isInteger(runs) || runs < 1) usage('--runs must be a whole number of at least 1.')

let testCase
try {
  testCase = JSON.parse(await readFile(casePath, 'utf8'))
} catch (error) {
  usage(`Could not read ${casePath}: ${error.message}`)
}
const caseDir = dirname(resolve(casePath))

// The real type of each image by its base64 data (files may be PNG; the
// app always sends JPEG).
const mimeTypes = new Map()

// An image value: a file path (relative to the case file) or base64 data.
// Returns base64 data.
async function loadImage(value, what) {
  if (typeof value !== 'string' || !value) usage(`${what}: missing image.`)
  const extension = extname(value).toLowerCase()
  if (!MIME_TYPES[extension]) return value.replace(/^data:image\/\w+;base64,/, '')
  try {
    const data = (await readFile(join(caseDir, value))).toString('base64')
    mimeTypes.set(data, MIME_TYPES[extension])
    return data
  } catch (error) {
    return usage(`${what}: ${error.message}`)
  }
}

// A card as /api/restyle gets it: { mode, photo? }; a photo means Reference.
async function loadCard(card = {}, what) {
  const mode = card.mode ?? (card.photo ? 'reference' : 'creative')
  if (mode === 'creative') return { mode }
  return { mode, photo: await loadImage(card.photo, what) }
}

const input = {
  render: await loadImage(testCase.render, 'render'),
  room: await loadCard(testCase.room, 'room photo'),
  objects: await Promise.all(
    (testCase.objects ?? []).map(async (object) => {
      if (typeof object.name !== 'string' || typeof object.x !== 'number' || typeof object.y !== 'number') {
        usage('Each object needs a name, x and y.')
      }
      return { name: object.name, x: object.x, y: object.y, ...(await loadCard(object, object.name)) }
    }),
  ),
}

const images = promptImages(input).map((image) => ({ ...image, mimeType: mimeTypes.get(image.data) ?? image.mimeType }))
const basePrompt = buildPrompt(input)
const withShades = shades ? withWallShadesLine(basePrompt) : basePrompt
const prompt = white ? withWhiteAreaLine(withShades) : withShades
const extras = `${white ? '-white' : ''}${shades ? '-shades' : ''}`
const label = `${basename(casePath, extname(casePath))}-${PROMPT_VERSION}${extras}`
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
await mkdir(OUT_DIR, { recursive: true })
await writeFile(join(OUT_DIR, `${stamp}-${label}-prompt.txt`), prompt)

const lineNames = [white && 'white line', shades && 'wall-shades line'].filter(Boolean)
console.log(
  `${MODEL}, prompt ${PROMPT_VERSION}${lineNames.map((name) => ` + ${name}`).join('')}, ${images.length} image(s), ${runs} run(s): ${label}`,
)
for (let run = 1; run <= runs; run++) {
  const started = Date.now()
  try {
    const result = await restyleImage({
      apiKey: process.env.GEMINI_API_KEY,
      prompt,
      images,
      signal: AbortSignal.timeout(60_000),
    })
    const extension = result.mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const file = join(OUT_DIR, `${stamp}-${label}-${run}.${extension}`)
    await writeFile(file, Buffer.from(result.data, 'base64'))
    console.log(`  run ${run}: ${file} (${((Date.now() - started) / 1000).toFixed(1)} s)`)
  } catch (error) {
    console.log(`  run ${run}: failed: ${error.message}${error.detail ? ` ${error.detail}` : ''}`)
  }
}
