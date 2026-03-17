import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import SectionContainer from '../components/composition/SectionContainer'
import MetricsGrid from '../components/composition/MetricsGrid'
import DetailList from '../components/composition/DetailList'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { fetchJson } from '../utils/apiClient'

const page = normalizePageCopy('agingSummaryReport', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

const FALLBACK = {
  reportType: 'ar-summary',
  title: 'AR Summary Report',
  generatedAt: new Date().toISOString(),
  summary: [],
  columns: [
    { key: 'bucket', label: 'Aging bucket' },
    { key: 'invoices', label: 'Invoices', align: 'right', mono: true },
    { key: 'billed', label: 'Billed', align: 'right', mono: true },
    { key: 'received', label: 'Received', align: 'right', mono: true },
    { key: 'outstanding', label: 'Outstanding', align: 'right', mono: true },
  ],
  rows: [],
}

function AgingSummaryReportPage({ shell }) {
  const [reportData, setReportData] = useState(FALLBACK)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedRowId, setSelectedRowId] = useState('')

  useEffect(() => {
    fetchJson('/api/reports/generate?type=ar-summary')
      .then((data) => {
        setReportData(data)
        setSelectedRowId(data.rows?.[0]?.id ?? '')
      })
      .catch(() => setLoadError('Live data unavailable.'))
      .finally(() => setIsLoading(false))
  }, [])

  const selectedRow = useMemo(
    () => reportData.rows.find((row) => row.id === selectedRowId) ?? reportData.rows[0],
    [reportData.rows, selectedRowId],
  )

  const detailPanel = {
    title: page.detailPanel.title,
    subtitle: page.detailPanel.subtitle,
    content: (
      <Surface compact glass title={page.detailPanel.summaryTitle} eyebrow={selectedRow?.bucket ?? page.detailPanel.summaryEyebrow}>
        <DetailList
          items={selectedRow
            ? [
                { label: 'Bucket', value: selectedRow.bucket },
                { label: 'Invoices', value: selectedRow.invoices },
                { label: 'Billed', value: selectedRow.billed },
                { label: 'Received', value: selectedRow.received },
                { label: 'Outstanding', value: selectedRow.outstanding },
              ]
            : [{ label: 'State', value: 'No row selected' }]}
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
            <span className="page-badge">{isLoading ? 'Loading...' : `${reportData.rows.length} buckets`}</span>
            <Button size="sm" variant="secondary">Export</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        {loadError ? <p className="page-copy">{loadError}</p> : null}
        <SectionContainer eyebrow={page.sections.summary.eyebrow} title={page.sections.summary.title}>
          {reportData.summary.length > 0 && <MetricsGrid items={reportData.summary} />}
        </SectionContainer>

        <SectionContainer eyebrow={page.sections.report.eyebrow} title={page.sections.report.title}>
          <DataTable
            columns={reportData.columns}
            description={page.sections.report.tableDescription}
            onRowClick={setSelectedRowId}
            rowSelectionEnabled
            rows={reportData.rows}
            selectedRowId={selectedRow?.id}
            title={page.sections.report.tableTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default AgingSummaryReportPage
