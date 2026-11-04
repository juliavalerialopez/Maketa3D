// Saving files from the page (I.2): Save / Save As (the layout file) and the
// AI version downloads. Everything is already in the page, so there is no
// server call: one link click per file.
import { makeZip } from './zip'

// How long an object URL stays valid after its click. Safari and Firefox
// start the download after the click returns, so revoking right away can
// cancel it.
const REVOKE_DELAY_MS = 10_000

// File extension for an image type (the AI sends PNG or JPEG).
const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
const ZIP_NAME = 'maketa-restyles.zip'

// Saves `url` (a data URL or an object URL) as `fileName`.
export function saveUrl(url, fileName) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
}

// Saves a Blob as `fileName`.
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  saveUrl(url, fileName)
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

// A base64 data URL's parts: { type, base64 }, e.g. "image/png" and the data
// after the comma.
export function dataUrlParts(dataUrl) {
  const comma = dataUrl.indexOf(',')
  return { type: dataUrl.slice(5, comma).split(';')[0], base64: dataUrl.slice(comma + 1) }
}

function dataUrlBytes(dataUrl) {
  const binary = atob(dataUrlParts(dataUrl).base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

// File name of a version's image: maketa-restyle-<number>.<ext> (H.4).
function versionFileName(version) {
  const { type } = dataUrlParts(version.image)
  return `maketa-restyle-${version.number}.${EXTENSIONS[type] ?? 'png'}`
}

// Saves one version as an image file.
export function saveVersion(version) {
  saveUrl(version.image, versionFileName(version))
}

// Saves every version in one ZIP file, so there is one save prompt.
export function saveVersionsZip(versions) {
  const files = versions.map((version) => ({ name: versionFileName(version), bytes: dataUrlBytes(version.image) }))
  saveBlob(new Blob([makeZip(files)], { type: 'application/zip' }), ZIP_NAME)
}
