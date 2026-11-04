import Button from '../ui/Button'
import { exportLayout } from '../../store/layoutFile'

// Shown by ErrorBoundary in place of a part that stopped working (I.3). The
// room and objects still live in the stores, so the layout can be saved
// before reloading.
export default function ErrorScreen({ message }) {
  return (
    <div className="error-screen" role="alert">
      <p className="error-screen-message">{message}</p>
      <div className="error-screen-actions">
        <Button onClick={() => exportLayout()}>Save layout</Button>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  )
}
