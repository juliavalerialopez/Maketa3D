# Maketa

3D room configurator web app, built as a 5-part prototype:
1. Room dimensions
2. Place primitive objects
3. Rearrange them
4. Camera render
5. AI restyle

## Stack (fixed, do not substitute)
- Vite + React, JavaScript (not TypeScript)
- React Three Fiber, Three.js, Drei
- Zustand for state
- npm, run with `npm run dev`

React is pinned to `19.2.8` (not a caret range) because `@react-three/fiber@9.7.0`
peer-depends on `react >=19 <19.3`. When bumping React, re-check that peer range
first.

## Structure
- `src/components/` — R3F scene components
- `src/store/` — Zustand stores
- `public/models/` — static assets (`.glb`, etc.), referenced as URL strings
  (e.g. `"/models/x.glb"`), **never** as ES imports

## Constraints
- No extra libraries, UI frameworks, or routing beyond the stack above.
- Assets in `/public` are referenced as URL strings, never imported.

## Deploy rule
Every day must end with a working deploy. Before stopping work, run
`npm run build` and confirm it succeeds, and make sure the latest commit is
pushed and deployed on Vercel.
