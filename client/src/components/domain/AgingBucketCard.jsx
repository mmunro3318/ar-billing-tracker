import Badge from '../primitives/Badge'
import Surface from '../primitives/Surface'

function AgingBucketCard({ label, value, count, share, tone }) {
  return (
    <Surface className="bucket-card" compact glass>
      <div className="bucket-header">
        <div className="surface-copy">
          <span className="surface-eyebrow">{label}</span>
          <p className="bucket-value">{value}</p>
        </div>
        <Badge tone={tone}>{count} invoices</Badge>
      </div>
      <div className="bucket-footer">
        <span className="status-inline">Portfolio share {share}</span>
      </div>
      <div className="mini-bar" aria-hidden="true">
        <span style={{ width: share }} />
      </div>
    </Surface>
  )
}

export default AgingBucketCard