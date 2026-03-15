function Surface({
  title,
  eyebrow,
  description,
  actions,
  children,
  compact = false,
  glass = false,
  className = '',
}) {
  const classes = ['surface', compact ? 'surface--compact' : '', glass ? 'surface--glass' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes}>
      {(title || eyebrow || description || actions) ? (
        <header className="surface-header">
          <div className="surface-copy">
            {eyebrow ? <span className="surface-eyebrow">{eyebrow}</span> : null}
            {title ? <h3 className="surface-title">{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="surface-actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export default Surface