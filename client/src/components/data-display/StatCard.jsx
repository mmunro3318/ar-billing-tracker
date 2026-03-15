import Badge from '../primitives/Badge'
import Surface from '../primitives/Surface'

function StatCard({ title, value, trend, tone = 'accent' }) {
  return (
    <Surface className="stat-card" compact>
      <div className="stat-header">
        <span className="meta-label">{title}</span>
        <Badge tone={tone}>{trend.label}</Badge>
      </div>
      <p className="stat-value">{value}</p>
      <div className="stat-trend">
        <span className="status-inline">{trend.context}</span>
      </div>
    </Surface>
  )
}

export default StatCard