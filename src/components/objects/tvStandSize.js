// TV stand measurements (meters), shared by the model and the catalog.
// A 16:9 TV: inches × these = meters.
export const TV_WIDTH_PER_INCH = 0.02214
export const TV_HEIGHT_PER_INCH = 0.01245
export const STAND_HEIGHT = 0.45
export const STAND_DEPTH = 0.4
export const STAND_MARGIN = 0.1 // stand wider than the TV on each side
export const TV_LIFT = 0.07 // foot and neck between the stand and the panel

// The object's size for a screen size in inches: the stand is the TV width
// plus a margin on each side; the height is the stand, foot and TV.
export function tvStandSize(inches) {
  return {
    width: inches * TV_WIDTH_PER_INCH + 2 * STAND_MARGIN,
    depth: STAND_DEPTH,
    height: STAND_HEIGHT + TV_LIFT + inches * TV_HEIGHT_PER_INCH,
  }
}
