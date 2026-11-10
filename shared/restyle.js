// Restyle limits and values used by both the browser (src/services/restyle.js,
// frame.js) and the server (api/restyle.js), so the two can never disagree
// (I.8). Plain JS with no imports: Vite bundles it into the page, Vercel into
// the function.

// Reference photos per request, the room's included (H.7).
export const MAX_PHOTOS = 8

// Objects per request.
export const MAX_OBJECTS = 60

// Largest request body the server accepts, in characters of JSON (Vercel
// allows 4.5 MB).
export const MAX_BODY = 4_000_000

// The browser keeps its request body under this, a little below MAX_BODY.
export const BODY_BUDGET = 3_900_000

// Which way an object's front faces in the Room render (I.19), one of eight:
// toward the camera, the right or left of the image, or away from the camera,
// and the four in between. Sent only for types with a front.
export const FACINGS = ['front', 'front-right', 'right', 'back-right', 'back', 'back-left', 'left', 'front-left']
