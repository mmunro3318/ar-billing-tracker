import Button from '../primitives/Button'

function ReadOnlyModeBanner() {
  return (
    <div className="read-only-banner">
      <div>
        <strong>Read-only mode</strong>
        <span className="page-copy">Internet connectivity dropped. Reports remain visible, but edits and approvals are paused.</span>
      </div>
      <Button size="sm" variant="ghost">Queue reconnect check</Button>
    </div>
  )
}

export default ReadOnlyModeBanner