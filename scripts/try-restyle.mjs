// Prompt spike (Part F, F.1 and F.2): sends a Room render fixture and a
// reference photo to Gemini with the live prompt and saves the results.
//
//   node --env-file=.env.local scripts/try-restyle.mjs <render> <photo> [--white] [--runs N]
//
// --white  adds the T6 white-area line to the prompt
// --runs   number of runs (default 3, the pass rule needs 2 of 3)
// Results go to scratch/restyle-runs/ (gitignored).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { restyleImage, MODEL } from '../api/_gemini.js'
import { PROMPT, PROMPT_VERSION, withWhiteAreaLine } from '../api/_restyle-prompt.js'

const MIME_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
const OUT_DIR = 'scratch/restyle-runs'

function usage(message) {
  console.error(message)
  console.error('Usage: node --env-file=.env.local scripts/try-restyle.mjs <render> <photo> [--white] [--runs N]')
  process.exit(1)
}

async function loadImage(path) {
  const mimeType = MIME_TYPES[extname(path).toLowerCase()]
  if (!mimeType) usage(`Unsupported image type: ${path}`)
  return { data: (await readFile(path)).toString('base64'), mimeType }
}

const args = process.argv.slice(2)
const white = args.includes('--white')
const runsIndex = args.indexOf('--runs')
const runs = runsIndex >= 0 ? Number(args[runsIndex + 1]) : 3
const [renderPath, photoPath] = args.filter(
  (arg, i) => !arg.startsWith('--') && !(runsIndex >= 0 && i === runsIndex + 1),
)

if (!process.env.GEMINI_API_KEY) usage('GEMINI_API_KEY is not set (put it in .env.local).')
if (!renderPath || !photoPath) usage('Give a render and a photo.')
if (!Number.isInteger(runs) || runs < 1) usage('--runs must be a whole number of at least 1.')

const render = await loadImage(renderPath)
const photo = await loadImage(photoPath)
const prompt = white ? withWhiteAreaLine(PROMPT) : PROMPT
const label = `${basename(renderPath, extname(renderPath))}-${PROMPT_VERSION}${white ? '-white' : ''}`
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
await mkdir(OUT_DIR, { recursive: true })

console.log(`${MODEL}, prompt ${PROMPT_VERSION}${white ? ' + white line' : ''}, ${runs} run(s): ${label}`)
for (let run = 1; run <= runs; run++) {
  const started = Date.now()
  try {
    const result = await restyleImage({
      apiKey: process.env.GEMINI_API_KEY,
      prompt,
      render,
      photo,
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
