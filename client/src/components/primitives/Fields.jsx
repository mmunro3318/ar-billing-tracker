function FieldShell({ label, meta, children }) {
  return (
    <label className="field-shell">
      <span className="field-label">
        <span>{label}</span>
        {meta ? <span>{meta}</span> : null}
      </span>
      {children}
    </label>
  )
}

export function TextInput({ label, meta, ...props }) {
  return (
    <FieldShell label={label} meta={meta}>
      <input className="field-control" {...props} />
    </FieldShell>
  )
}

export function SelectField({ label, meta, options, ...props }) {
  return (
    <FieldShell label={label} meta={meta}>
      <select className="field-control" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function TextAreaField({ label, meta, ...props }) {
  return (
    <FieldShell label={label} meta={meta}>
      <textarea className="field-control" {...props} />
    </FieldShell>
  )
}

export function ToggleField({ label, copy, defaultChecked = false }) {
  return (
    <label className="toggle">
      <input className="toggle-input" defaultChecked={defaultChecked} type="checkbox" />
      <span className="toggle-track" aria-hidden="true" />
      <span className="toggle-copy">
        <strong>{label}</strong>
        <span>{copy}</span>
      </span>
    </label>
  )
}

export function CheckboxField({ label, copy, defaultChecked = false }) {
  return (
    <label className="checkbox">
      <input className="checkbox-input" defaultChecked={defaultChecked} type="checkbox" />
      <span className="checkbox-box" aria-hidden="true" />
      <span className="checkbox-copy">
        <strong>{label}</strong>
        <span>{copy}</span>
      </span>
    </label>
  )
}