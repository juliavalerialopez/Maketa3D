// A square of dots in the corner of the 2D view, one meter on each side at
// the view's zoom: the same dots as the grid floor, so one grid square reads
// as 1 m². Its size comes from MeterScale. Lets clicks through.
export default function ScaleLegend() {
  return (
    <div className="scale-legend" aria-hidden="true">
      <i className="scale-top" />
      <i className="scale-bottom" />
      <i className="scale-left" />
      <i className="scale-right" />
      <span>1 m²</span>
    </div>
  )
}
