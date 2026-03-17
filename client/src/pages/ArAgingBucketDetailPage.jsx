import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Badge from '../components/primitives/Badge'
import DataTable from '../components/data-display/DataTable'
import SectionContainer from '../components/composition/SectionContainer'
import agingSampleData from './data/agingSampleData.json'
import pageCopy from './data/pageCopy.json'
import { filterInvoicesByBucket, normalizeAgingSampleData } from '../utils/sampleDataContracts'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { fetchJson } from '../utils/apiClient'

const normalizedAgingData = normalizeAgingSampleData(agingSampleData)
const agingCopy = normalizePageCopy('aging', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)
const fallbackStatus = { label: 'Unknown', tone: 'muted' }

const columns = [
  { key: 'id', label: 'Invoice' },
  { key: 'client', label: 'Client' },
  { key: 'serviceDate', label: 'Date Billed' },
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

function formatBucketLabel(bucketName) {
  return String(bucketName)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace('Plus', '120+ Days')
}

function ArAgingBucketDetailPage({ shell }) {
  const { bucketName = '' } = useParams()
  const [query, setQuery] = useState('')
  const [invoiceRows, setInvoiceRows] = useState(() => filterInvoicesByBucket(normalizedAgingData.invoiceRows, bucketName))
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadBucketInvoices() {
      try {
        const payload = await fetchJson(`/api/invoices?bucket=${encodeURIComponent(bucketName)}`)
        if (!isActive) {
          return
        }

        const normalized = normalizeAgingSampleData({
          invoiceRows: payload?.invoiceRows ?? [],
          agingBuckets: [],
          timelineItems: [],
        })

        setInvoiceRows(normalized.invoiceRows)
        setLoadError('')
      } catch {
        if (!isActive) {
          return
        }

        setInvoiceRows(filterInvoicesByBucket(normalizedAgingData.invoiceRows, bucketName))
        setLoadError('Live data unavailable. Showing sample dataset.')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadBucketInvoices()

    return () => {
      isActive = false
    }
  }, [bucketName])

  const filteredRows = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) {
      return invoiceRows
    }

    return invoiceRows.filter((row) => (
      String(row.client).toLowerCase().includes(text)
      || String(row.id).toLowerCase().includes(text)
      || String(row.company).toLowerCase().includes(text)
    ))
  }, [invoiceRows, query])

  const detailPanel = {
    title: 'Bucket focus',
    subtitle: 'Filtered view for focused follow-up and outreach planning.',
    content: (
      <div className="detail-stack">
        <span className="eyebrow">Selected bucket</span>
        <h3 className="surface-title">{formatBucketLabel(bucketName)}</h3>
        <p>{filteredRows.length} matching invoices in current sample set.</p>
      </div>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: shellBrandTitle,
        copy: agingCopy.brandCopy,
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">AR Aging</span>
            <h2 className="page-title">Bucket: {formatBucketLabel(bucketName)}</h2>
            <p className="page-copy">Search and review invoices in this aging segment.</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{isLoading ? 'Loading invoices...' : 'Bucket drill-down'}</span>
            <Button onClick={() => shell.onNavigate({ path: '/aging' })} size="sm" variant="secondary">Back to AR Aging</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        {loadError ? <p className="page-copy">{loadError}</p> : null}
        <SectionContainer
          description="Use quick search to narrow by client, invoice, or company."
          eyebrow="Drill-down"
          title="Invoice focus list"
        >
          <div className="toolbar">
            <div className="field-shell" style={{ maxWidth: '360px' }}>
              <label className="field-label" htmlFor="bucket-search">Search</label>
              <input
                className="field-control"
                id="bucket-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search client, invoice, or company"
                type="search"
                value={query}
              />
            </div>
          </div>
          <DataTable
            columns={columns}
            description="Filtered by selected aging bucket."
            rows={filteredRows}
            title="Bucket invoices"
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default ArAgingBucketDetailPage
