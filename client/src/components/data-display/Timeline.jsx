function Timeline({ title, description, items }) {
  return (
    <section className="surface">
      <header className="timeline-header">
        <div className="surface-copy">
          <span className="surface-eyebrow">History</span>
          <h3 className="surface-title">{title}</h3>
          <p>{description}</p>
        </div>
      </header>

      <div className="timeline-list">
        {items.map((item) => (
          <div key={item.id} className="timeline-item">
            <span aria-hidden="true" className={`timeline-dot timeline-dot--${item.tone}`} />
            <div className="timeline-copy">
              <div className="timeline-title">
                <strong>{item.title}</strong>
                <span className="timeline-meta">{item.meta}</span>
              </div>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Timeline