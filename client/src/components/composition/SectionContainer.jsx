function SectionContainer({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
}) {
  const classes = ['section-shell', className].filter(Boolean).join(' ')

  return (
    <section className={classes}>
      <div className="section-heading">
        <div className="section-copy">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          {title ? <h3 className="section-title">{title}</h3> : null}
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="surface-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export default SectionContainer