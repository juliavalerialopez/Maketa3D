// A role color of the current theme (a CSS variable in src/index.css, e.g.
// '--selection'), for things drawn in the 3D scene. Read once per theme and
// variable; data-theme is already set when the store's theme changes.
const colors = {}

export function themeColor(variable, theme) {
  const key = `${theme}${variable}`
  colors[key] ??= getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return colors[key]
}
