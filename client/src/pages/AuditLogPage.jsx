import RoutePlaceholderPage from './RoutePlaceholderPage'

function AuditLogPage({ shell }) {
  return (
    <RoutePlaceholderPage
      description="Audit event streams and before/after diffs will be extracted into this route in a follow-up sprint."
      eyebrow="Audit Log"
      message="No audit timeline page has been split out yet."
      shell={shell}
      title="Audit timeline workspace"
    />
  )
}

export default AuditLogPage