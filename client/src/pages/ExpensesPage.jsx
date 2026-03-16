import { useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Badge from '../components/primitives/Badge'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import Timeline from '../components/data-display/Timeline'
import StatCard from '../components/data-display/StatCard'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import MetricsGrid from '../components/composition/MetricsGrid'
import expensesSampleData from './data/expensesSampleData.json'
import pageCopy from './data/pageCopy.json'

const { expenseMetrics, categoryCards, expenseRows, timelineItems } = expensesSampleData
const expensesCopy = pageCopy.expenses
const fallbackStatus = { label: 'Unknown', tone: 'muted' }

const columns = [
  {
    key: 'vendor',
    label: 'Vendor',
    render: (row) => (
      <div className="table-primary">
        <strong>{row.vendor}</strong>
        <span className="table-meta">{row.id}</span>
      </div>
    ),
  },
  { key: 'date', label: 'Date' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', align: 'right', mono: true },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const status = row?.status ?? fallbackStatus
      return <Badge tone={status.tone}>{status.label}</Badge>
    },
  },
]

function ExpensesPage({ shell }) {
  const [selectedExpenseId, setSelectedExpenseId] = useState(expenseRows[0]?.id)

  const selectedExpense = useMemo(
    () => expenseRows.find((row) => row.id === selectedExpenseId) ?? expenseRows[0],
    [selectedExpenseId],
  )

  const detailPanel = {
    title: expensesCopy.detailPanel.title,
    subtitle: expensesCopy.detailPanel.subtitle,
    content: (
      <>
        <Surface
          compact
          glass
          title={expensesCopy.detailPanel.summaryTitle}
          eyebrow={selectedExpense?.id ?? expensesCopy.detailPanel.summaryEyebrow}
        >
          <DetailList
            items={[
              { label: 'Vendor', value: selectedExpense?.vendor },
              { label: 'Category', value: selectedExpense?.category },
              { label: 'Amount', value: selectedExpense?.amount },
              { label: 'Date', value: selectedExpense?.date },
            ]}
          />
        </Surface>
        <Timeline
          description={expensesCopy.detailPanel.timelineDescription}
          items={timelineItems}
          title={expensesCopy.detailPanel.timelineTitle}
        />
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: pageCopy.shell.brandTitle,
        copy: expensesCopy.brandCopy,
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{expensesCopy.topBar.eyebrow}</span>
            <h2 className="page-title">{expensesCopy.topBar.title}</h2>
            <p className="page-copy">{expensesCopy.topBar.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{expensesCopy.topBar.badge}</span>
            {expensesCopy.topBar.actions.map((action) => (
              <Button key={action.label} size={action.size} variant={action.variant}>{action.label}</Button>
            ))}
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer
          description={expensesCopy.sections.categories.description}
          eyebrow={expensesCopy.sections.categories.eyebrow}
          title={expensesCopy.sections.categories.title}
        >
          <MetricsGrid items={expenseMetrics} />
          <div className="section-grid section-grid--stats">
            {categoryCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          description={expensesCopy.sections.ledger.description}
          eyebrow={expensesCopy.sections.ledger.eyebrow}
          title={expensesCopy.sections.ledger.title}
        >
          <DataTable
            actions={
              <div className="toolbar-group">
                {expensesCopy.sections.ledger.tableActions.map((action) => (
                  <Button key={action.label} size={action.size} variant={action.variant}>{action.label}</Button>
                ))}
              </div>
            }
            columns={columns}
            description={expensesCopy.sections.ledger.tableDescription}
            onRowClick={setSelectedExpenseId}
            rowSelectionEnabled
            rows={expenseRows}
            selectedRowId={selectedExpenseId}
            title={expensesCopy.sections.ledger.tableTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default ExpensesPage