function DataTable({
  title,
  description,
  columns,
  rows,
  actions,
  onRowClick,
  selectedRowId,
  rowSelectionEnabled = false,
}) {
  const canSelectRows = rowSelectionEnabled && typeof onRowClick === 'function'
  const normalizedSelectedRowId = selectedRowId == null ? null : String(selectedRowId)

  const resolveRowId = (row, index) => {
    const id = row?.id
    if (typeof id === 'string' || typeof id === 'number') {
      return String(id)
    }

    return `row-${index}`
  }

  const handleRowKeyDown = (event, rowId) => {
    if (!canSelectRows) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick(rowId)
    }
  }

  return (
    <section className="surface surface--glass">
      <header className="table-header">
        <div className="surface-copy">
          <span className="surface-eyebrow">Data Grid</span>
          <h3 className="surface-title">{title}</h3>
          <p>{description}</p>
        </div>
        {actions ? <div className="surface-actions">{actions}</div> : null}
      </header>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align === 'right' ? 'table-cell--right' : ''}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowId = resolveRowId(row, index)
              const hasValidId = row?.id != null
              const rowIsSelectable = canSelectRows && hasValidId

              return (
                <tr
                  key={rowId}
                  className={[
                    rowIsSelectable ? 'table-row--selectable' : '',
                    normalizedSelectedRowId === rowId ? 'table-row--selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={rowIsSelectable ? () => onRowClick(row.id) : undefined}
                  onKeyDown={(event) => handleRowKeyDown(event, row.id)}
                  role={rowIsSelectable ? 'button' : undefined}
                  tabIndex={rowIsSelectable ? 0 : undefined}
                >
                  {columns.map((column) => {
                    const content = column.render ? column.render(row) : (row?.[column.key] ?? '—')
                    const classNames = [
                      column.align === 'right' ? 'table-cell--right' : '',
                      column.mono ? 'table-cell--mono' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <td key={column.key} className={classNames}>
                        {content}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default DataTable