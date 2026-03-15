function Badge({ children, tone = 'muted', mono = false }) {
  const classes = ['badge', `badge--${tone}`, mono ? 'badge--mono' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes}>
      <span aria-hidden="true" className="badge__dot" />
      {children}
    </span>
  )
}

export default Badge