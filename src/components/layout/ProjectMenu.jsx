import { useEffect, useRef, useState } from 'react'
import MenuButton from '../ui/MenuButton'
import { useModeStore } from '../../store/modeStore'
import { LAYOUT_FILE_NAME, exportLayout, importLayout, newLayout } from '../../store/layoutFile'

const ERROR_MESSAGE = 'Not a valid layout file.'
const ERROR_SECONDS = 5
const NEW_PROJECT_QUESTION = 'Start a new project? Unsaved changes will be lost.'

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
// and Save As (asks for a file name first). New and Open only work in Plan:
// in Personalize they would leave the Room render out of date.
// An invalid file shows a short message for a few seconds and changes nothing.
export default function ProjectMenu() {
  const mode = useModeStore((state) => state.mode)
  const inputRef = useRef(null)
  const [error, setError] = useState(null)

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

  function newProject() {
    if (window.confirm(NEW_PROJECT_QUESTION)) newLayout()
  }

  function saveAs() {
    const text = window.prompt('File name', LAYOUT_FILE_NAME.replace(/\.json$/, ''))
    const fileName = text === null ? null : toFileName(text)
    if (fileName) exportLayout(fileName)
  }

  const inPlan = mode === 'plan'
  const items = [
    { label: 'New Project', onSelect: newProject, disabled: !inPlan },
    { label: 'Open Project', onSelect: () => inputRef.current.click(), disabled: !inPlan },
    { label: 'Save', onSelect: () => exportLayout() },
    { label: 'Save As', onSelect: saveAs },
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
    </div>
  )
}
