function InlineAlert({ tone = 'accent', title, children }) {
  return (
    <div className={`inline-alert inline-alert--${tone}`}>
      <span aria-hidden="true" className="inline-alert__icon" />
      <div className="inline-alert-copy">
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}

export default InlineAlert