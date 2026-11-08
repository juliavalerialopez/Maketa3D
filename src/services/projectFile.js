// The browser's file access (I.17), for the project file: the system "Open"
// and "Save as" windows give a file handle, and Save writes into it again
// without asking. Chrome and Edge have it; elsewhere canPickFiles() is false
// and the layout file is opened with a file input and saved as a download
// (services/download.js).

const FILE_TYPES = [{ description: 'Maketa project', accept: { 'application/json': ['.json'] } }]

// True when the browser has the system Open and Save as windows.
export const canPickFiles = () =>
  typeof globalThis.showOpenFilePicker === 'function' && typeof globalThis.showSaveFilePicker === 'function'

// Cancel in a system window rejects with an AbortError: no file chosen.
async function unlessCancelled(pick) {
  try {
    return await pick()
  } catch (error) {
    if (error?.name === 'AbortError') return null
    throw error
  }
}

// The system Open window: the chosen file's handle, or null on Cancel.
export async function pickFileToOpen() {
  const handles = await unlessCancelled(() => globalThis.showOpenFilePicker({ types: FILE_TYPES, multiple: false }))
  return handles?.[0] ?? null
}

// The system Save as window, starting on `suggestedName`: the chosen file's
// handle, or null on Cancel.
export function pickFileToSave(suggestedName) {
  return unlessCancelled(() => globalThis.showSaveFilePicker({ suggestedName, types: FILE_TYPES }))
}

// Writes `text` into the file, replacing its content. An opened file may ask
// the browser's "Allow this site to edit?" question first; a refusal throws.
export async function writeFile(handle, text) {
  if (handle.requestPermission && (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
    throw new Error('Permission to edit the file was refused.')
  }
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}
