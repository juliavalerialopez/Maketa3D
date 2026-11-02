import { useEffect, useRef, useState } from 'react'
import MenuButton from '../ui/MenuButton'
import Dialog from '../ui/Dialog'
import { useModeStore } from '../../store/modeStore'
import { LAYOUT_FILE_NAME, exportLayout, importLayout, newLayout } from '../../store/layoutFile'

const ERROR_MESSAGE = 'Not a valid layout file.'
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

// The Maketa logo in the top bar, which opens the Project menu: New Project,
// Open Project (reads a layout file), Save (downloads maketa-layout.json)
// and Save As (asks for a file name first). New Project and Save As use a
// Dialog. New and Open only work in Plan:
// in Personalize they would leave the Room render out of date.
// An invalid file shows a short message for a few seconds and changes nothing.
export default function ProjectMenu() {
  const mode = useModeStore((state) => state.mode)
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  // The open dialog: null, 'newProject' or 'saveAs'.
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), ERROR_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [error])

  async function handleFile(event) {
    const input = event.target
    const file = input.files[0]
    // Cleared so choosing the same file again still fires a change.
    input.value = ''
    if (!file) return
    let ok = false
    try {
      ok = importLayout(await file.text())
    } catch {
      // Unreadable file: treated as invalid.
    }
    setError(ok ? null : ERROR_MESSAGE)
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
    exportLayout(fileName)
  }

  const inPlan = mode === 'plan'
  const items = [
    { label: 'New Project', onSelect: () => setDialog('newProject'), disabled: !inPlan },
    { label: 'Open Project', onSelect: () => inputRef.current.click(), disabled: !inPlan },
    { label: 'Save', onSelect: () => exportLayout() },
    { label: 'Save As', onSelect: () => setDialog('saveAs') },
  ]

  return (
    <div className="project-menu">
      <h1 className="top-bar-title">
        <MenuButton label="Maketa" title="Project" items={items} variant="plain" align="start" />
      </h1>
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
