# Maketa

A 3D room editor in the browser. Set the room size, place and arrange furniture, then let AI restyle the view from your own reference photos.

**Live demo:** https://maketa3-d.vercel.app

Maketa is a practice project: a prototype built with spec-driven development and Claude Code, published online to test the full path from idea to deploy.

## What it does

- **Plan mode.** Enter the room dimensions in meters, add objects (sofa, coffee table, armchair, TV stand with an adjustable screen size, bookshelf, floor lamp), then select, drag, rotate, tilt, recolor and delete them in the 3D scene, with undo and redo. A 16:9 frame guide shows what the render will capture, and up to three camera slots under the scene save views to render from.
- **Personalize mode.** Switching modes captures a clean 1920 × 1080 render from each camera slot (the current view if none is saved). Pick a camera, add a reference photo per object (drag and drop works too), or choose Creative, and generate an AI version of the room. The room shape, camera angle, object positions and the way each piece faces stay the same, and only the room photo sets the walls and floor.
- **Versions.** Up to 6 generated images are kept as thumbnails, each remembering its own room render and camera, and can be downloaded.
- **Projects.** Save the layout, with its cameras, to a JSON file and open it again from the Project menu (click the logo). In Chrome and Edge, Save writes back into the opened file; the project's name shows next to the logo.
- **Light and dark theme.** A soft UI style called Moss System.

## Stack

- Vite, React and JavaScript (no TypeScript)
- React Three Fiber, Three.js and Drei for the 3D scene
- Zustand for state
- Plain CSS with theme variables, no UI libraries
- Vercel serverless functions in `api/` for the AI call, with Upstash Redis for the daily limits
- Gemini image model for the restyle (see `docs/decisions/0001-restyle-model.md`)
- `node:test` for unit tests, Oxlint for linting

API keys exist only on the server as environment variables, never in `src/`. Generations are limited per day (3 per visitor and 20 in total by default) to cap cost.

## Run it locally

```bash
npm install
npm run dev
```

`npm run dev` runs the app only. The AI restyle needs the serverless function, so for that use the Vercel CLI:

```bash
npx vercel link
npx vercel env pull .env.local
npx vercel dev
```

For local testing, `RESTYLE_MOCK=1` in `.env.local` makes the restyle return the room render after 2 seconds, with no AI call. `RESTYLE_VISITOR_LIMIT` and `RESTYLE_TOTAL_LIMIT` raise the daily limits. Never set these in production.

Other commands:

```bash
npm run build   # production build
npm run lint    # Oxlint
npm test        # unit tests
```

## How it is built

The project follows spec-driven development. The specs are the source of truth, and the code follows them.

- `docs/SPEC.md` is the product spec: layout, data model and project file format.
- `docs/specs/part-*.md` split the work into parts (A to I), each with numbered tasks, a backlog and a changelog.
- `docs/decisions/` holds decision records, for example the image model choice.
- `docs/prompts/` holds the AI prompts, with numbered versions and test results.
- `CLAUDE.md` is the shared context for Claude Code: stack rules, structure, and a checkpoint workflow where each task is reviewed before it is committed.
- `.claude/agents/` has three Claude Code subagents: a verifier (build, lint, tests), a spec reviewer, and a researcher.

## Project structure

```
src/components/   modes, layout, panels, 3D scene, objects, shared UI controls
src/store/        Zustand stores and pure helpers (room bounds, project file)
src/services/     browser code that talks to the server or prepares data
shared/           limits used by both the browser and the server
api/              Vercel functions (restyle, limits, prompt)
tests/            unit tests
docs/             specs, decisions, prompts, design mocks
```
