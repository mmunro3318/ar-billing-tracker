function AuditDiffRow({ label, before, after, actor, timestamp }) {
  return (
    <div className="audit-row">
      <div className="timeline-title">
        <strong>{label}</strong>
        <span className="timeline-meta">{timestamp}</span>
      </div>
      <div className="audit-values">
        <span className="audit-chip audit-chip--before">Before {before}</span>
        <span className="audit-chip audit-chip--after">After {after}</span>
      </div>
      <span className="status-inline">Reviewed by {actor}</span>
    </div>
  )
}

export default AuditDiffRow