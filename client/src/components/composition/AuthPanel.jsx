import Surface from '../primitives/Surface'

function AuthPanel({ title, eyebrow, description, glass = false, className = '', children }) {
  const classes = ['span-6', 'auth-card', className].filter(Boolean).join(' ')

  return (
    <Surface className={classes} eyebrow={eyebrow} glass={glass} title={title}>
      {description ? (
        <div className="auth-copy">
          <p>{description}</p>
        </div>
      ) : null}
      {children}
    </Surface>
  )
}

export default AuthPanel