// A short message under a group of fields (K.1.7), e.g. why a size was refused.
// `id` is what the refused field's `aria-describedby` points at.
export default function GroupMessage({ id, children }) {
  return (
    <p id={id} className="panel-problem" role="status">
      {children}
    </p>
  )
}
