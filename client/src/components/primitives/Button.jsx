function Button({
  children,
  variant = 'primary',
  size = 'md',
  leadingDot = false,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = ['button', `button--${variant}`, `button--${size}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} type={type} {...props}>
      {leadingDot ? <span aria-hidden="true" className="button__dot" /> : null}
      {children}
    </button>
  )
}

export default Button