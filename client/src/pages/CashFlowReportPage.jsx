import { useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Badge from '../components/primitives/Badge'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import SectionContainer from '../components/composition/SectionContainer'
import StatCard from '../components/data-display/StatCard'
import DetailList from '../components/composition/DetailList'
import Timeline from '../components/data-display/Timeline'
import cashFlowReportData from './data/cashFlowReportData.json'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { normalizeCashFlowReportData } from '../utils/sampleDataContracts'

const reportData = normalizeCashFlowReportData(cashFlowReportData)
const page = normalizePageCopy('cashFlowReport', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)
const fallbackStatus = { label: 'Unknown', tone: 'muted' }

function CashFlowReportPage({ shell }) {
  const [periodFilter, setPeriodFilter] = useState(reportData.filters.period)
  const [categoryFilter, setCategoryFilter] = useState(reportData.filters.category)
  const [selectedRowId, setSelectedRowId] = useState(reportData.transactionRows[0]?.id)

  const filteredRows = useMemo(() => reportData.transactionRows.filter((row) => {
    const periodMatch = periodFilter === 'all' || row.period === periodFilter
    const categoryMatch = categoryFilter === 'all' || row.category === categoryFilter
    return periodMatch && categoryMatch
  }), [categoryFilter, periodFilter])

  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.id === selectedRowId) ?? filteredRows[0],
    [filteredRows, selectedRowId],
  )

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'inflow', label: 'Inflow', align: 'right', mono: true },
    { key: 'outflow', label: 'Outflow', align: 'right', mono: true },
    { key: 'net', label: 'Net', align: 'right', mono: true },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const status = row?.status ?? fallbackStatus
        return <Badge tone={status.tone}>{status.label}</Badge>
      },
    },
  ]

  const detailPanel = {
    title: page.detailPanel.title,
    subtitle: page.detailPanel.subtitle,
    content: (
      <>
        <Surface compact glass title={page.detailPanel.summaryTitle} eyebrow={selectedRow?.id ?? page.detailPanel.summaryEyebrow}>
          <DetailList
            items={[
              { label: 'Date', value: selectedRow?.date ?? 'N/A' },
              { label: 'Category', value: selectedRow?.category ?? 'N/A' },
              { label: 'Inflow', value: selectedRow?.inflow ?? '$0.00' },
              { label: 'Outflow', value: selectedRow?.outflow ?? '$0.00' },
            ]}
          />
        </Surface>
        <Timeline
          description={page.detailPanel.timelineDescription}
          items={reportData.timelineItems}
          title={page.detailPanel.timelineTitle}
        />
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{ title: shellBrandTitle, copy: page.brandCopy }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{page.topBar.eyebrow}</span>
            <h2 className="page-title">{page.topBar.title}</h2>
            <p className="page-copy">{page.topBar.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{filteredRows.length} rows</span>
            <Button size="sm" variant="secondary">Export</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer eyebrow={page.sections.metrics.eyebrow} title={page.sections.metrics.title}>
          <div className="section-grid section-grid--stats">
            {reportData.flowMetrics.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>
        </SectionContainer>

        <SectionContainer eyebrow={page.sections.transactions.eyebrow} title={page.sections.transactions.title}>
          <DataTable
            actions={
              <div className="toolbar-group">
                <label className="field-shell">
                  <span className="field-label"><span>Period</span></span>
                  <select className="field-control" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
                    {reportData.periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="field-shell">
                  <span className="field-label"><span>Category</span></span>
                  <select className="field-control" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    {reportData.categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <Button size="sm" variant="ghost" onClick={() => { setPeriodFilter('month'); setCategoryFilter('all') }}>Reset</Button>
              </div>
            }
            columns={columns}
            description={page.sections.transactions.tableDescription}
            onRowClick={setSelectedRowId}
            rowSelectionEnabled
            rows={filteredRows}
            selectedRowId={selectedRow?.id}
            title={page.sections.transactions.tableTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default CashFlowReportPage
