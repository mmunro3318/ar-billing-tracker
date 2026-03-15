function DetailList({ items, className = '' }) {
  const classes = ['detail-list', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {items.map((item) => (
        <div key={item.label} className="detail-row">
          <span className="detail-label">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default DetailList