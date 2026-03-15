import Surface from '../primitives/Surface'

function FormSection({
  title,
  eyebrow,
  description,
  className = '',
  glass = false,
  layoutClassName = 'form-grid',
  children,
}) {
  return (
    <Surface className={className} description={description} eyebrow={eyebrow} glass={glass} title={title}>
      <div className={layoutClassName}>{children}</div>
    </Surface>
  )
}

export default FormSection