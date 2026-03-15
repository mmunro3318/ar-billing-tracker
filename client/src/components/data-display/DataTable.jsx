function DataTable({ title, description, columns, rows, actions }) {
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
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => {
                  const content = column.render ? column.render(row) : row[column.key]
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default DataTable