# 0001: Image model for the AI restyle

- **Date:** 2026-10-28
- **Status:** Accepted

## Context
Part F sends the Room render and one reference photo to an image-edit model, which must restyle the room and replace the grey box sofa with the sofa in the photo. The main risk is geometry: the room shape, the camera angle and the sofa's angle must stay as in the render. In manual tests in the Gemini app, a reference image gave the best sofa but turned it to face the camera.

The call runs in a Vercel function. Vercel allows at most 4.5 MB for the request body and for the response body, and Hobby functions run up to 300 s. The output must be 16:9. Cost is capped by the daily limits (20 a day in total).

## Options considered
Prices as of October 2026.

| | Nano Banana 2.1 (Google) | GPT Image 2 (OpenAI) | FLUX.2 [pro] (Black Forest Labs) |
|---|---|---|---|
| Price per image | $0.0336 at 1K, $0.0504 at 2K (Google's pricing page) | about $0.041, medium quality, landscape (third-party figure) | $0.03 for the first MP + $0.015 per extra MP, plus $0.015 per MP of each reference (about $0.045 at 1080p) |
| Reference images | up to 10 object images | several (maximum not documented) | about 8 through the API (docs disagree) |
| 16:9 output | native `aspect_ratio: "16:9"`, 1K / 2K / 4K | custom size, e.g. 1536 × 864 | any size |
| Geometry and angle | strongest on perspective in informal tests; same family as the manual tests | leads on reference adherence, weakest on perspective | reported to change areas that should stay |
| Fit with Vercel | synchronous REST, base64 in and out | synchronous, can take up to 2 minutes | asynchronous, needs polling |

No published benchmark measures camera-angle preservation during furniture replacement, so the F.1 spike is the real test.

## Decision
Nano Banana 2.1 (`gemini-nano-banana-2.1`) through the Gemini API, output 1K 16:9. Fallback: GPT Image 2, if prompt tuning (F.2) cannot make T1 to T3 pass.

## Consequences
- Every result carries Google's SynthID watermark.
- About $0.034 per image: at most about $0.70 a day at 20 images.
- The key must be on a billing-enabled (paid tier) project. On the free tier Google may use submitted content to improve its products. On the paid tier it does not, but it logs requests for a limited time to detect misuse.
- The model is new (GA 2026-10-06). Gemini 2.5 Flash Image, the older Nano Banana, shut down on 2026-10-02.
- 1K output keeps the response under 4.5 MB; 2K is in the Backlog.
- Switching models means updating this ADR (new status) and the prompt in `docs/prompts/restyle.md`.

## Verification
- Model ID and 1K price to be confirmed in F.1.1 from Google's official docs. The figures above come from the planning research.
- 2026-10-28 (F.1.1): confirmed on Google's official pages. The pricing page (ai.google.dev/gemini-api/docs/pricing) lists `gemini-nano-banana-2.1` at $0.0336 per 1K image ($0.0504 at 2K, $0.0168 per 1K in batch), paid tier only. The image generation page lists it as the recommended model, with `aspect_ratio: "16:9"` and `image_size: "1K"`. Request shape used: `POST /v1beta/interactions` with a text item and two image items.
- The manual tests used the Gemini app; the API may behave differently, so F.1 is the real test.
