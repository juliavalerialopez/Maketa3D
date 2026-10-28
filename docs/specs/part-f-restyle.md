# Part F: AI restyle

Status: **In progress**. Builds on Part E (Plan and Personalize modes, Room render, empty AI image slot and panel).

## Goal
In Personalize I upload one photo of a styled living room and press Generate. The AI image slot then shows my room restyled to match the photo, with the grey box sofa replaced by the sofa in the photo. The room shape, the camera angle and the sofa's position and angle stay exactly as in the Room render.

## Requirements

### What the AI gets and keeps
- Input: the Room render already shown at the top left (no new snapshot in Personalize; to change the room, go back to Plan) and one reference photo. No text box.
- The photo is used for both the sofa and the room style.
- Kept from the Room render: room shape, camera angle, the sofa's position and angle.
- Taken from the photo: the sofa's look and size (its own cushions and pillows come with it), and the room's walls, floor, light and mood.
- Nothing else is added: no plants, rug, shelf, wooden slats, extra furniture or any decor that is not in the 3D scene.
- Model: Nano Banana 2.1, output 1K 16:9 (see `docs/decisions/0001-restyle-model.md`). Prompt: `docs/prompts/restyle.md`.

### Reference image (panel group)
- A collapsible `Section` "Reference image" (`id="reference-image"`, open state in `uiStore`).
- An "Upload photo" button (shared `Button`) opens a hidden file input that accepts JPG, PNG and WebP. No drag and drop.
- Checks, with these messages:
  - Wrong type: "Use a JPG, PNG or WebP image."
  - Over 10 MB: "The photo is larger than 10 MB."
  - Does not decode: "This file could not be read."
- After upload the photo is resized once in the browser (longest edge 1536 px, JPEG quality 0.85) and shown as a small preview with Replace and Remove buttons.
- The photo stays when switching modes and is lost on reload (memory only).
- Notice line in the group: "Your photo is sent to Google's Gemini API to make the image. Maketa does not store it. Google may keep requests for a short time to detect misuse."

### Generate and Regenerate
- One button below the group, always visible (also when the group is collapsed).
- Label: "Generate" when the AI image slot is empty, "Regenerate" when it shows a result for the current Room render. There is no second button.
- Regenerate uses the same photo and the same Room render and counts as a normal generation against both limits.
- Disabled when there is no photo, no Room render, a request is running, or 0 generations are left.
- Next to the button: "N of 3 left today".
  - The count comes from the server: `GET /api/restyle` when the panel mounts, then the `remaining` value of every `POST` response.
  - N is what this visitor can still make today: the smaller of their own 3 and what is left of the 20 in total.
  - At 0 the button is disabled and the limit message is shown.
- Loading:
  - No previous result: the AI image slot shows "Generating…".
  - With a previous result: the old image stays, dimmed, with a small "Generating…" label.
- If the request fails, the previous result (if any) stays.
- Error messages:
  - Visitor limit: "You've used your 3 images for today. Try again tomorrow."
  - Total limit: "Daily limit reached (20 images a day). Try again tomorrow."
  - Failure: "The image could not be made. Try again."
  - Timeout: "The request took too long. Try again."

### Result
- The result fills the "AI image" slot (16:9). Nothing else in this part: no download, no clear button.
- A new Room render (switching to Personalize) clears the AI image slot back to black: the top-left and top-right images always match.
- Each request is tagged with the snapshot it was made from. A response that arrives after a new Room render was taken is ignored.

### Limits
- 20 successful generations per UTC day in total, and 3 per visitor. Failed tries are not counted.
- A visitor is identified by an HMAC-SHA256 of their IP (the first `x-forwarded-for` entry), keyed with a daily salt. The salt is an HMAC of the server secret `VISITOR_SECRET` and the UTC date, so hashes cannot be linked across days. Uses `node:crypto` (built in).
- Only the hash is stored, never the raw IP; the IP is never logged. A request without an IP counts as one shared "unknown" visitor.
- Counts live in Upstash Redis (Vercel Marketplace, free tier), called over its REST API with `fetch`:
  - Total: `restyle:YYYY-MM-DD`. Visitor: `restyle:YYYY-MM-DD:v:<hash>`. Both expire after 2 days.

### Server (`api/restyle.js`)
- A Vercel Node function. No npm packages: `fetch` and `node:crypto` only.
- `POST` with a JSON body `{ render, photo }` (base64 JPEG):
  - The browser re-encodes the render to 1280 × 720 JPEG quality 0.9 before sending. Bodies over 4 MB are rejected (Vercel's limit is 4.5 MB).
  - Increments the total and the visitor count in one Upstash transaction. If either goes over its limit, both are undone and the response is 429 with `limit: 'visitor'` or `limit: 'total'`.
  - Calls Gemini with an explicit 60 second timeout (`AbortController`); it does not rely on the 300 s Vercel limit. A timeout returns 504 and maps to the "took too long" message.
  - If Gemini fails or times out, both counts are undone.
  - Returns `{ image, remaining }`. A 1K output keeps the response under Vercel's 4.5 MB.
- `GET` returns `{ remaining }` without counting.
- Errors: 400 bad input, 429 limit, 502 provider failure, 504 timeout.
- Model, prompt (`api/_restyle-prompt.js`, matching the latest version in `docs/prompts/restyle.md`) and output size are fixed on the server.
- The Gemini key exists only on the server (env var), on a billing-enabled (paid tier) Google project: on the free tier Google may use submitted content to improve its products.
- Photos and results are never stored or logged by us.
- `RESTYLE_MOCK=1` (local only) returns the render after 2 s, with no AI call and no counting.

### State
- `src/store/restyleStore.js`, memory only: `photo` (`{ dataUrl, name }` or null), `photoError`, `status` ('idle' | 'loading'), `error`, `result`, `resultSnapshot`, `remaining`, and `generate()`.
- `generate()` lives in the store, so a running request is not lost when Personalize unmounts.
- Resizing and requests live in `src/services/restyle.js`.

### Local testing
- `npm run dev` does not run `/api`. Use `npx vercel dev` (Vite and `/api` together) after `npx vercel link` and `npx vercel env pull .env.local` (gitignored by `*.local`). The Vercel CLI is not added to `package.json`.
- Prompt tests run outside the app: `node --env-file=.env.local scripts/try-restyle.mjs <fixture> <photo>`.

## Tasks
- ⬜ F.1 Prompt spike: `scripts/try-restyle.mjs` (Node, `fetch`) sends a fixture, a photo and the current prompt to Gemini; paths are arguments, outputs go to a gitignored `scratch/restyle-runs/`
  - ✅ F.1.1 Confirm the exact model ID (`gemini-nano-banana-2.1`) and the 1K price ($0.0336) in Google's official docs; note the result in the ADR. The manual tests used the Gemini app and the API may behave differently, so F.1 is the real test.
  - ⬜ F.1.2 Save the three fixtures (Julia, see Fixtures below)
  - ⬜ F.1.3 Run prompt v1 on every fixture with `reference-couch.jpg`, with and without the white-area line (T6); record which works better in `restyle.md` and close the open question
- ⬜ F.2 Prompt tuning until T1, T2 and T3 pass (see Test cases)
- ✅ F.3 `api/restyle.js`: POST and GET, input checks, Gemini call with a 60 s `AbortController`, errors (400/429/502/504), `RESTYLE_MOCK`; local only
- ✅ F.4 Limits in Upstash: visitor hash with daily salt, total and visitor counts in one transaction, undo on 429 or failure, `remaining` in every response. Deploy only after this task.
- ✅ F.5 `ui/Button` gets a `disabled` prop
- ⬜ F.6 `restyleStore.js` and `services/restyle.js` (resizing, requests, error messages)
- ⬜ F.7 A new Room render clears the AI image; responses for an older render are ignored
- ⬜ F.8 Reference image group: upload, checks, preview, Replace, Remove, notice
- ⬜ F.9 Generate / Regenerate button: label, disabled states, "N of 3 left today", loading (empty slot or dimmed old image), old result kept on failure, error messages
- ⬜ F.10 Docs: CLAUDE.md (dated stack exception for `/api` and Upstash, `api/`, `services/`, `docs/prompts/`, `docs/decisions/`, `npx vercel dev`) and the SPEC.md data model
- ⬜ F.11 Build passes and deploy (last task of the part)
  - Gemini key from a billing-enabled (paid tier) Google project
  - On Vercel: `GEMINI_API_KEY`, `VISITOR_SECRET` and the Upstash variables set; `RESTYLE_MOCK` not set in production
  - A spend alert set on the Google project
  - No key in the client bundle (grep `dist/`)
  - Acceptance criteria checked on the live site

### Test cases (F.2)
- T1 Sofa angle kept: the same sides of the sofa are visible as in the render; it is not turned toward the camera.
- T2 No added decor: nothing in the result that is not in the render, except the sofa and the pillows on it.
- T3 Room shape kept: walls, corners and floor edges in the same places; no new windows, doors, beams or baseboards.
- T4 Sofa look from the photo: shape, fabric, color, legs and pillows match the sofa in the photo.
- T5 Room style from the photo: wall color, floor material, light and mood follow the photo.
- T6 White areas outside the room are handled the same way every run (decided in F.1.3).

Rules:
- A test case passes when it succeeds in at least 2 of 3 runs on all three fixtures. T1, T2 and T3 must all pass.
- Levers, tried in this order: image order and labels; a written camera description; scene facts from the stores in the prompt (would be a new dated task); the fallback model (would update the ADR).
- Every prompt change is a new version in `restyle.md`, with its results.
- If T1, T2 and T3 still fail after every lever: stop and show the results before F.3 starts.

### Fixtures (F.1.2)
Saved by Julia: in Personalize, right-click the Room render, Save image as, into `docs/prompts/fixtures/`. The reference photo stays outside the repo.
1. `fixture-1-corner.png`, corner 3/4: reload the page (room 6 × 5 × 2.6 m, default camera high up on a diagonal), add one Sofa, do not move it or the camera, press Personalize.
2. `fixture-2-side.png`, side view: one Sofa at its default place; orbit until the camera is low (about seat height) and looks at the sofa from its side, one arm toward the camera and a wall behind it.
3. `fixture-3-rotated.png`, rotated sofa: reload, add one Sofa, set Rotation Y to 45° in Object details, keep the default camera. If that shows the sofa straight on, use −45° and note the value.

## Out of scope
Download. Clear button. Drag and drop. Text instructions. Saving results. More panel groups. A new snapshot in Personalize.

## Acceptance criteria
- [ ] The Personalize panel has a collapsible "Reference image" group with an Upload photo button and the privacy notice.
- [ ] JPG, PNG and WebP up to 10 MB upload; a wrong type, a file over 10 MB and an unreadable file each show their message.
- [ ] An uploaded photo shows a small preview; Replace and Remove work.
- [ ] The photo is still there after switching to Plan and back, and gone after a reload.
- [ ] Generate is disabled until a photo and a Room render exist.
- [ ] Generate shows "Generating…" in the empty slot, then the result in the AI image slot.
- [ ] After a result the button reads "Regenerate"; during Regenerate the old result stays, dimmed, with "Generating…".
- [ ] If a request fails, the old result stays and the failure message shows.
- [ ] "N of 3 left today" counts down after each success; at 0 the button is disabled with the limit message.
- [ ] The 4th generation for one visitor and the 21st of the day are refused with their messages; failed tries are not counted.
- [ ] A Gemini call over 60 s ends with the "took too long" message.
- [ ] A new Room render clears the AI image back to black; a response for an older render is not shown.
- [ ] T1, T2 and T3 pass on the live site.
- [ ] No Gemini key in the client bundle (grep `dist/`).
- [ ] `RESTYLE_MOCK` is not set in production.
- [ ] The Gemini key is on a billing-enabled project with a spend alert.
- [ ] No console errors when switching modes during a request.
- [ ] `npm run build` succeeds with no errors.
- [ ] Deployed and working on the live Vercel URL.

## Backlog
- Download the AI image.
- Clear result button.
- Drag and drop upload.
- Text instructions next to the photo.
- Saving results.
- More panel groups.
- 2K output (needs a way around Vercel's 4.5 MB response limit).
- Part E backlog, to review: Refresh render button, placeable camera object, fixed 1920 × 1080 render, Personalize group state in `uiStore`.

## Open questions
- How to treat the white areas outside the room (T6): decided in F.1.3.

## Changelog
- 2026-10-28: Draft created. Scope: reference photo upload, Generate / Regenerate through a serverless function with Nano Banana 2.1, daily limits (20 in total, 3 per visitor), result in the AI image slot.
- 2026-10-28: Goals confirmed, Part F started (In progress).
