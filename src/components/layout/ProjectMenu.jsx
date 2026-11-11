import { useEffect, useEffectEvent, useRef, useState } from 'react'
import MenuButton from '../ui/MenuButton'
import Dialog from '../ui/Dialog'
import { useModeStore } from '../../store/modeStore'
import { selectProjectName, useProjectStore } from '../../store/projectStore'
import {
  LAYOUT_FILE_NAME,
  canPickFiles,
  newLayout,
  openProject,
  openProjectFile,
  saveProject,
  saveProjectAs,
} from '../../store/layoutFile'

const MESSAGES = {
  invalid: 'Not a valid layout file.',
  failed: 'Could not save the file.',
}
const ERROR_SECONDS = 5
const DEFAULT_NAME = LAYOUT_FILE_NAME.replace(/\.json$/, '')

// "my room" -> "my room.json". Null when nothing usable is left.
function toFileName(text) {
  const name = text
    .trim()
    .replace(/\.json$/i, '')
    .replace(/[\\/:*?"<>|]/g, '-')
  return name ? `${name}.json` : null
}

// The Maketa logo in the top bar, which opens the Project menu, and the
// project's name next to it ("New Project" until saved under a name, I.17).
// - New Project asks first (Dialog).
// - Open Project and Save As use the system Open and Save as windows where
//   the browser has them; Save then writes into that file without asking
//   (I.17). Elsewhere, Open uses a file input, Save downloads, and Save As
//   asks for a file name in a Dialog.
// New and Open only work in Plan: in Personalize they would leave the Room
// render out of date. An invalid file or a failed save shows a short message
// for a few seconds.
// Shortcuts (J0.5): Ctrl+S saves in every mode, Ctrl+O opens where Open
// Project works (Cmd on Mac), also while typing in a field; the browser's own
// Save and Open are blocked.
export default function ProjectMenu() {
  const mode = useModeStore((state) => state.mode)
  const projectName = useProjectStore(selectProjectName)
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  // The open dialog: null, 'newProject' or 'saveAs'.
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), ERROR_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [error])

  // Shows the message for an Open, Save or Save As result (none when done
  // or cancelled).
  async function report(action) {
    const result = await action
    setError(MESSAGES[result] ?? null)
  }

  function handleFile(event) {
    const input = event.target
    const file = input.files[0]
    // Cleared so choosing the same file again still fires a change.
    input.value = ''
    if (file) report(openProjectFile(file))
  }

  function open() {
    if (canPickFiles()) report(openProject())
    else inputRef.current.click()
  }

  function saveAs() {
    if (canPickFiles()) report(saveProjectAs())
    else setDialog('saveAs')
  }

  function confirmNewProject() {
    setDialog(null)
    newLayout()
  }

  // An empty (or unusable) name keeps the dialog open.
  function confirmSaveAs(text) {
    const fileName = toFileName(text)
    if (!fileName) return
    setDialog(null)
    report(saveProjectAs(fileName))
  }

  const inPlan = mode === 'plan'

  // Runs in the key press itself, with no wait before the system window, so
  // the browser counts the press as the user's action that may open it.
  const handleShortcut = useEffectEvent((event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
    const key = event.key.toLowerCase()
    if (key !== 's' && key !== 'o') return
    event.preventDefault()
    // A held key repeats: one window at a time.
    if (event.repeat) return
    // A modal dialog (New Project, the Save As name) keeps the keyboard.
    if (document.querySelector('dialog[open]')) return
    if (key === 's') {
      // A field being typed in is finished first (limited, like a blur), so
      // the saved file has the checked value and opens again.
      const active = document.activeElement
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') active.blur()
      report(saveProject())
    } else if (inPlan) open()
  })

  useEffect(() => {
    const listener = (event) => handleShortcut(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const items = [
    { label: 'New Project', onSelect: () => setDialog('newProject'), disabled: !inPlan },
    { label: 'Open Project', onSelect: open, disabled: !inPlan },
    { label: 'Save', onSelect: () => report(saveProject()) },
    { label: 'Save As', onSelect: saveAs },
  ]

  return (
    <div className="project-menu">
      <h1 className="top-bar-title">
        <MenuButton label="Maketa" title="Project" items={items} variant="plain" align="start" />
      </h1>
      <span className="project-name" title={projectName}>
        {projectName}
      </span>
      {error && (
        <span className="top-bar-error" role="alert">
          {error}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={handleFile}
      />
      {dialog === 'newProject' && (
        <Dialog
          title="Start a new project?"
          message="The room goes back to its default size and all objects are removed. Unsaved changes will be lost."
          confirmLabel="New Project"
          onConfirm={confirmNewProject}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'saveAs' && (
        <Dialog
          title="Save As"
          input={{ label: 'File name', defaultValue: DEFAULT_NAME }}
          confirmLabel="Save"
          onConfirm={confirmSaveAs}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}
