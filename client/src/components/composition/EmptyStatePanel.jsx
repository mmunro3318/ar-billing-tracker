import Surface from '../primitives/Surface'

function EmptyStatePanel({ title, eyebrow, message, description, glass = true, className = '' }) {
  const classes = ['span-6', 'empty-state', className].filter(Boolean).join(' ')

  return (
    <Surface className={classes} eyebrow={eyebrow} glass={glass} title={title}>
      <span className="empty-icon" aria-hidden="true" />
      <div className="empty-copy">
        <strong>{message}</strong>
        <p>{description}</p>
      </div>
    </Surface>
  )
}

export default EmptyStatePanel