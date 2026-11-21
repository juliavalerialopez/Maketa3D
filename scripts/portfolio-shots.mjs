// Takes the standard portfolio screenshots of Maketa: Plan and Personalize,
// in the light and the dark theme, with a fixed furnished room.
// Run by hand or by the portfolio-updater subagent. Not part of the app build.
//
// Playwright is not a dependency of the app. Install it without touching
// package.json (once per npm install, which removes it again):
//   npm install --no-save playwright
//   npx playwright install chromium
//
// Usage:
//   node scripts/portfolio-shots.mjs --out docs/portfolio/images/part-i
//   node scripts/portfolio-shots.mjs --out <folder> --url http://localhost:5173
//
// --url defaults to the live site. --layout defaults to
// docs/portfolio/maketa-layout.json (the room that is loaded for every shot).
// It never generates an AI image (that costs money); AI results are added by hand.
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

function readArgs() {
  const args = {}
  for (let i = 2; i < process.argv.length; i += 2) {
    args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1]
  }
  return args
}

const args = readArgs()
const url = args.url ?? 'https://maketa3-d.vercel.app'
const layout = path.resolve(args.layout ?? 'docs/portfolio/maketa-layout.json')
if (!args.out) {
  console.error('Missing --out <folder>, for example --out docs/portfolio/images/part-i')
  process.exit(1)
}
const outDir = path.resolve(args.out)
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
const saved = []
const failed = []

// Waits for the 3D scene to draw a few frames.
const settle = (page) => page.waitForTimeout(2000)

async function shoot(page, name) {
  const file = path.join(outDir, `${name}.png`)
  await page.screenshot({ path: file })
  saved.push(file)
}

async function run(scheme) {
  const context = await browser.newContext({
    colorScheme: scheme,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  // Without the system file pickers the app falls back to a plain file input,
  // which a script can fill.
  await context.addInitScript(() => {
    delete window.showOpenFilePicker
    delete window.showSaveFilePicker
  })
  const page = await context.newPage()
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator('canvas').first().waitFor()

    // Load the fixed room through the Project menu.
    await page.getByRole('button', { name: 'Maketa' }).click()
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText('Open Project').click(),
    ])
    await chooser.setFiles(layout)
    await settle(page)
    await shoot(page, `plan-${scheme}`)

    // Personalize takes the Room render from the Plan camera.
    await page.getByRole('button', { name: 'Personalize', exact: true }).click()
    await settle(page)
    await shoot(page, `personalize-${scheme}`)
  } catch (error) {
    failed.push(`${scheme}: ${error.message.split('\n')[0]}`)
  } finally {
    await context.close()
  }
}

await run('light')
await run('dark')
await browser.close()

for (const file of saved) console.log(`saved ${path.relative(process.cwd(), file)}`)
for (const message of failed) console.error(`failed ${message}`)
process.exit(failed.length > 0 ? 1 : 0)
