import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import SectionContainer from '../components/composition/SectionContainer'
import MetricsGrid from '../components/composition/MetricsGrid'
import DetailList from '../components/composition/DetailList'
import { TextInput } from '../components/primitives/Fields'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { fetchJson } from '../utils/apiClient'

const page = normalizePageCopy('cashFlowReport', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

const FALLBACK = {
  reportType: 'cash-flow',
  title: 'Cash Flow Summary Report',
  generatedAt: new Date().toISOString(),
  summary: [],
  columns: [
    { key: 'period', label: 'Period' },
    { key: 'inflow', label: 'Inflow', align: 'right', mono: true },
    { key: 'outflow', label: 'Outflow', align: 'right', mono: true },
    { key: 'net', label: 'Net', align: 'right', mono: true },
  ],
  rows: [],
}

function CashFlowReportPage({ shell }) {
  const [reportData, setReportData] = useState(FALLBACK)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedRowId, setSelectedRowId] = useState('')

  const loadReport = (from, to) => {
    setIsLoading(true)
    setLoadError('')
    const params = new URLSearchParams({ type: 'cash-flow' })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    fetchJson(`/api/reports/generate?${params.toString()}`)
      .then((data) => {
        setReportData(data)
        setSelectedRowId(data.rows?.[0]?.id ?? '')
      })
      .catch(() => {
        setLoadError('Live data unavailable. Showing empty report.')
        setReportData(FALLBACK)
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchJson('/api/reports/generate?type=cash-flow')
      .then((data) => {
        setReportData(data)
        setSelectedRowId(data.rows?.[0]?.id ?? '')
      })
      .catch(() => setLoadError('Live data unavailable. Showing empty report.'))
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
      <Surface compact glass title={page.detailPanel.summaryTitle} eyebrow={selectedRow?.period ?? page.detailPanel.summaryEyebrow}>
        <DetailList
          items={selectedRow
            ? [
                { label: 'Period', value: selectedRow.period },
                { label: 'Inflow', value: selectedRow.inflow },
                { label: 'Outflow', value: selectedRow.outflow },
                { label: 'Net', value: selectedRow.net },
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
            <span className="page-badge">{isLoading ? 'Loading...' : `${reportData.rows.length} periods`}</span>
            <Button size="sm" variant="secondary">Export</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        {loadError ? <p className="page-copy">{loadError}</p> : null}
        <SectionContainer eyebrow={page.sections.metrics.eyebrow} title={page.sections.metrics.title}>
          {reportData.summary.length > 0 && <MetricsGrid items={reportData.summary} />}
        </SectionContainer>

        <SectionContainer eyebrow={page.sections.transactions.eyebrow} title={page.sections.transactions.title}>
          <DataTable
            actions={
              <div className="toolbar-group">
                <TextInput label="From" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                <TextInput label="To" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                <Button size="sm" onClick={() => loadReport(fromDate, toDate)} disabled={isLoading}>Load</Button>
                <Button size="sm" variant="ghost" onClick={() => { setFromDate(''); setToDate(''); loadReport('', '') }}>Reset</Button>
              </div>
            }
            columns={reportData.columns}
            description={page.sections.transactions.tableDescription}
            onRowClick={setSelectedRowId}
            rowSelectionEnabled
            rows={reportData.rows}
            selectedRowId={selectedRow?.id}
            title={page.sections.transactions.tableTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default CashFlowReportPage
