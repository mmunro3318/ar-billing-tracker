import { useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Badge from '../components/primitives/Badge'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import SectionContainer from '../components/composition/SectionContainer'
import MetricsGrid from '../components/composition/MetricsGrid'
import DetailList from '../components/composition/DetailList'
import AgingBucketCard from '../components/domain/AgingBucketCard'
import agingSampleData from './data/agingSampleData.json'
import agingSummaryReportData from './data/agingSummaryReportData.json'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { normalizeAgingSampleData, normalizeAgingSummaryReportData } from '../utils/sampleDataContracts'

const agingData = normalizeAgingSampleData(agingSampleData)
const reportData = normalizeAgingSummaryReportData(agingSummaryReportData)
const page = normalizePageCopy('agingSummaryReport', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)
const fallbackStatus = { label: 'Unknown', tone: 'muted' }

function AgingSummaryReportPage({ shell }) {
  const [bucketFilter, setBucketFilter] = useState(reportData.filters.bucket)
  const [statusFilter, setStatusFilter] = useState(reportData.filters.status)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(agingData.invoiceRows[0]?.id)

  const filteredRows = useMemo(() => agingData.invoiceRows.filter((row) => {
    const bucketMatch = bucketFilter === 'all' || row.bucket === bucketFilter
    const statusMatch = statusFilter === 'all' || row.status?.label === statusFilter
    return bucketMatch && statusMatch
  }), [bucketFilter, statusFilter])

  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.id === selectedInvoiceId) ?? filteredRows[0],
    [filteredRows, selectedInvoiceId],
  )

  const columns = [
    { key: 'id', label: 'Invoice' },
    { key: 'client', label: 'Client' },
    { key: 'bucket', label: 'Bucket' },
    { key: 'company', label: 'Company' },
    { key: 'billedAmount', label: 'Billed', align: 'right', mono: true },
    { key: 'receivedAmount', label: 'Received', align: 'right', mono: true },
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
      <Surface compact glass title={page.detailPanel.summaryTitle} eyebrow={selectedRow?.id ?? page.detailPanel.summaryEyebrow}>
        <DetailList
          items={[
            { label: 'Client', value: selectedRow?.client ?? 'N/A' },
            { label: 'Bucket', value: selectedRow?.bucket ?? 'N/A' },
            { label: 'Billed', value: selectedRow?.billedAmount ?? '$0.00' },
            { label: 'Status', value: selectedRow?.status?.label ?? 'N/A' },
          ]}
        />
      </Surface>
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
        <SectionContainer eyebrow={page.sections.summary.eyebrow} title={page.sections.summary.title}>
          <MetricsGrid items={reportData.summaryMetrics} />
          <div className="section-grid section-grid--age">
            {agingData.agingBuckets.map((bucket) => (
              <AgingBucketCard
                key={bucket.label}
                {...bucket}
                onClick={() => setBucketFilter(bucket.label)}
              />
            ))}
          </div>
        </SectionContainer>

        <SectionContainer eyebrow={page.sections.report.eyebrow} title={page.sections.report.title}>
          <DataTable
            actions={
              <div className="toolbar-group">
                <label className="field-shell">
                  <span className="field-label"><span>Bucket</span></span>
                  <select className="field-control" value={bucketFilter} onChange={(event) => setBucketFilter(event.target.value)}>
                    {reportData.bucketOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="field-shell">
                  <span className="field-label"><span>Status</span></span>
                  <select className="field-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    {reportData.statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <Button size="sm" variant="ghost" onClick={() => { setBucketFilter('all'); setStatusFilter('all') }}>Reset</Button>
              </div>
            }
            columns={columns}
            description={page.sections.report.tableDescription}
            onRowClick={setSelectedInvoiceId}
            rowSelectionEnabled
            rows={filteredRows}
            selectedRowId={selectedRow?.id}
            title={page.sections.report.tableTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default AgingSummaryReportPage
