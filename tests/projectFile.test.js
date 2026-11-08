import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { layoutData, newLayout, openProject, saveProject, saveProjectAs } from '../src/store/layoutFile.js'
import { selectProjectName, useProjectStore } from '../src/store/projectStore.js'
import { useRoomStore } from '../src/store/roomStore.js'

// A fake file handle, as the system Open and Save as windows give (I.17).
function fakeFile(name, content = '') {
  const file = { name, content, writes: 0 }
  file.getFile = async () => ({ name, text: async () => file.content })
  file.requestPermission = async () => 'granted'
  file.createWritable = async () => ({
    write: async (text) => {
      file.content = text
      file.writes++
    },
    close: async () => {},
  })
  return file
}

const cancelled = () => Promise.reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }))
const project = () => useProjectStore.getState()
let opens
let saves

beforeEach(() => {
  newLayout()
  opens = []
  saves = []
  // The system windows answer with the next prepared file (or Cancel).
  globalThis.showOpenFilePicker = async () => {
    const next = opens.shift()
    return next ? [next] : cancelled()
  }
  globalThis.showSaveFilePicker = async () => saves.shift() ?? cancelled()
})

afterEach(() => {
  delete globalThis.showOpenFilePicker
  delete globalThis.showSaveFilePicker
})

test('a new project is called New Project', () => {
  assert.equal(selectProjectName(project()), 'New Project')
})

test('Save after Open writes into the opened file without asking', async () => {
  const file = fakeFile('My Project.json', JSON.stringify(layoutData()))
  opens.push(file)
  assert.equal(await openProject(), 'done')
  assert.equal(selectProjectName(project()), 'My Project')

  useRoomStore.getState().setRoomSize({ width: 7 })
  assert.equal(await saveProject(), 'done')
  assert.equal(file.writes, 1)
  assert.equal(JSON.parse(file.content).room.width, 7)
  assert.equal(saves.length, 0)
})

test('the first Save of a new project asks, then later Saves go to that file', async () => {
  const file = fakeFile('Living room.json')
  saves.push(file)
  assert.equal(await saveProject(), 'done')
  assert.equal(selectProjectName(project()), 'Living room')
  assert.equal(await saveProject(), 'done')
  assert.equal(file.writes, 2)
})

test('Save As always asks and switches to the new file', async () => {
  const first = fakeFile('A.json')
  const second = fakeFile('B.json')
  saves.push(first, second)
  await saveProject()
  assert.equal(await saveProjectAs(), 'done')
  assert.equal(selectProjectName(project()), 'B')
  await saveProject()
  assert.equal(first.writes, 1)
  assert.equal(second.writes, 2)
})

test('Cancel in a system window changes nothing', async () => {
  const file = fakeFile('Kept.json')
  saves.push(file)
  await saveProject()
  assert.equal(await saveProjectAs(), 'cancelled')
  assert.equal(await openProject(), 'cancelled')
  assert.equal(project().handle, file)
})

test('a refused permission is a failed save and keeps the file', async () => {
  const file = fakeFile('Mine.json')
  saves.push(file)
  await saveProject()
  file.requestPermission = async () => 'denied'
  assert.equal(await saveProject(), 'failed')
  assert.equal(project().handle, file)
})

test('an invalid file does not become the project file', async () => {
  opens.push(fakeFile('Broken.json', 'not json'))
  assert.equal(await openProject(), 'invalid')
  assert.equal(selectProjectName(project()), 'New Project')
})

test('New Project forgets the file, so the next Save asks again', async () => {
  saves.push(fakeFile('Old.json'))
  await saveProject()
  newLayout()
  assert.equal(selectProjectName(project()), 'New Project')
  assert.equal(project().handle, null)
  assert.equal(await saveProject(), 'cancelled')
})
