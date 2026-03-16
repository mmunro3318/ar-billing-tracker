import Badge from '../primitives/Badge'
import Surface from '../primitives/Surface'

function AgingBucketCard({ label, value, count, share, tone, onClick }) {
  const isInteractive = typeof onClick === 'function'

  return (
    <Surface className={`bucket-card ${isInteractive ? 'bucket-card--interactive' : ''}`.trim()} compact glass>
      <div className="bucket-header">
        <div className="surface-copy">
          <span className="surface-eyebrow">{label}</span>
          <p className="bucket-value">{value}</p>
        </div>
        <Badge tone={tone}>{count} invoices</Badge>
      </div>
      <div className="bucket-footer">
        <span className="status-inline">Portfolio share {share}</span>
        {isInteractive ? (
          <button className="button button--ghost button--sm" onClick={onClick} type="button">View bucket</button>
        ) : null}
      </div>
      <div className="mini-bar" aria-hidden="true">
        <span style={{ width: share }} />
      </div>
    </Surface>
  )
}

export default AgingBucketCard