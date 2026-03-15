function MetricsGrid({ items }) {
  return (
    <div className="hero-metrics">
      {items.map((item) => (
        <div key={item.label} className="metric-tile">
          <span className="meta-label">{item.label}</span>
          <strong className="metric-value">{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default MetricsGrid