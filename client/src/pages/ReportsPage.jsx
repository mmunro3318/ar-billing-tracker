import { useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import { SelectField, TextInput } from '../components/primitives/Fields'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { fetchJson } from '../utils/apiClient'

const shellBrandTitle = getShellBrandTitle(pageCopy)
const fallbackPage = normalizePageCopy('cashFlowReport', pageCopy)

const REPORT_TYPE_OPTIONS = [
  { label: 'Cash flow', value: 'cash-flow' },
  { label: 'AR summary', value: 'ar-summary' },
  { label: 'Client summary', value: 'client-summary' },
  { label: 'Expense summary', value: 'expense-summary' },
]

const FALLBACK_REPORT = {
  reportType: 'cash-flow',
  title: 'Cash Flow Summary Report',
  generatedAt: new Date().toISOString(),
  summary: [
    { label: 'Total inflow', value: '$0' },
    { label: 'Total outflow', value: '$0' },
    { label: 'Net', value: '$0' },
  ],
  columns: [
    { key: 'period', label: 'Period' },
    { key: 'inflow', label: 'Inflow', align: 'right', mono: true },
    { key: 'outflow', label: 'Outflow', align: 'right', mono: true },
    { key: 'net', label: 'Net', align: 'right', mono: true },
  ],
  rows: [],
}

function ReportsPage({ shell }) {
  const [reportType, setReportType] = useState('cash-flow')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reportData, setReportData] = useState(FALLBACK_REPORT)
  const [selectedRowId, setSelectedRowId] = useState('')

  const selectedRow = useMemo(() => {
    return reportData.rows.find((row) => row.id === selectedRowId) ?? reportData.rows[0]
  }, [reportData.rows, selectedRowId])

  const generateReport = async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const searchParams = new URLSearchParams({ type: reportType })
      if (fromDate) {
        searchParams.set('from', fromDate)
      }
      if (toDate) {
        searchParams.set('to', toDate)
      }

      const payload = await fetchJson(`/api/reports/generate?${searchParams.toString()}`)
      setReportData(payload)
      setSelectedRowId(payload?.rows?.[0]?.id || '')
    } catch {
      setReportData(FALLBACK_REPORT)
      setSelectedRowId('')
      setLoadError('Live report data unavailable. Showing empty report template.')
    } finally {
      setIsLoading(false)
    }
  }

  const detailPanel = {
    title: 'Report Snapshot',
    subtitle: 'Generated output',
    content: (
      <>
        <Surface compact glass title='Summary' eyebrow={reportData.reportType}>
          <DetailList items={reportData.summary || []} />
        </Surface>
        <Surface compact glass title='Selected row' eyebrow='Detail'>
          <DetailList
            items={selectedRow
              ? Object.keys(selectedRow)
                .filter((key) => key !== 'id')
                .slice(0, 4)
                .map((key) => ({ label: key, value: selectedRow[key] }))
              : [{ label: 'State', value: 'No row selected' }]}
          />
        </Surface>
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{ title: shellBrandTitle, copy: fallbackPage.brandCopy }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className='page-header'>
          <div className='hero-copy'>
            <span className='eyebrow'>Reports</span>
            <h2 className='page-title'>Report Builder</h2>
            <p className='page-copy'>Select report content and generate a formatted output.</p>
          </div>
          <div className='page-actions'>
            <span className='page-badge'>{isLoading ? 'Generating...' : `${reportData.rows?.length || 0} rows`}</span>
            <Button size='sm' variant='secondary'>Export PDF</Button>
            <Button size='sm' variant='secondary'>Export Excel</Button>
            <Button size='sm' variant='secondary'>Export Google Sheet</Button>
          </div>
        </header>
      }
    >
      <div className='page-stack'>
        {loadError ? <p className='page-copy'>{loadError}</p> : null}

        <SectionContainer eyebrow='Report config' title='Generate report'>
          <Surface glass title='Parameters'>
            <div className='toolbar-group'>
              <SelectField
                label='Report type'
                options={REPORT_TYPE_OPTIONS}
                value={reportType}
                onChange={(event) => setReportType(event.target.value)}
              />
              <TextInput label='From date' type='date' value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              <TextInput label='To date' type='date' value={toDate} onChange={(event) => setToDate(event.target.value)} />
              <Button size='sm' leadingDot onClick={generateReport} disabled={isLoading}>Generate</Button>
            </div>
          </Surface>
        </SectionContainer>

        <SectionContainer eyebrow='Report output' title={reportData.title || 'Generated Report'}>
          <DataTable
            columns={Array.isArray(reportData.columns) ? reportData.columns : FALLBACK_REPORT.columns}
            description={`Generated at ${new Date(reportData.generatedAt || Date.now()).toLocaleString()}`}
            onRowClick={setSelectedRowId}
            rowSelectionEnabled
            rows={Array.isArray(reportData.rows) ? reportData.rows : []}
            selectedRowId={selectedRow?.id}
            title='Report rows'
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default ReportsPage
