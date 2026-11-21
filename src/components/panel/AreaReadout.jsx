import { formatArea } from '../../store/roomMeasure'

// The room's floor area (K.1.7), read only, in m² with one decimal.
export default function AreaReadout({ area }) {
  return (
    <div className="area-readout">
      <span>Floor area</span>
      <output aria-label="Floor area">{formatArea(area)}</output>
    </div>
  )
}
