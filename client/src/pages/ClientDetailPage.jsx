import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppShell from '../components/shell/AppShell'
import Badge from '../components/primitives/Badge'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import clientsSampleData from './data/clientsSampleData.json'
import agingSampleData from './data/agingSampleData.json'
import pageCopy from './data/pageCopy.json'
import { normalizeAgingSampleData, normalizeClientsSampleData } from '../utils/sampleDataContracts'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { fetchJson } from '../utils/apiClient'

const clientsCopy = normalizePageCopy('clients', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)
const fallbackStatus = { label: 'Unknown', tone: 'muted' }

const invoiceColumns = [
  { key: 'id', label: 'Invoice' },
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

const paymentColumns = [
  { key: 'id', label: 'Payment' },
  { key: 'paymentDate', label: 'Date' },
  { key: 'allocations', label: 'Allocations' },
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

function buildFallback(clientId) {
  const normalizedClients = normalizeClientsSampleData(clientsSampleData)
  const normalizedAging = normalizeAgingSampleData(agingSampleData)
  const selected = normalizedClients.clientRows.find((row) => row.id === clientId) ?? normalizedClients.clientRows[0]

  return {
    summary: {
      id: selected?.id ?? clientId,
      name: selected?.name ?? 'Unknown client',
      contact: selected?.contact ?? 'Unassigned',
      status: selected?.status ?? fallbackStatus,
      totalOutstanding: selected?.totalOutstanding ?? '$0',
      daysPastDue: selected?.daysPastDue ?? '0',
      lastPaymentDate: selected?.lastPaymentDate ?? 'Unknown date',
      totalInvoices: String(normalizedAging.invoiceRows.length),
      totalPayments: '0',
    },
    invoiceRows: normalizedAging.invoiceRows.filter((row) => row.id),
    paymentRows: [],
  }
}

function ClientDetailPage({ shell }) {
  const { clientCode = '' } = useParams()
  const [summary, setSummary] = useState(() => buildFallback(clientCode).summary)
  const [invoiceRows, setInvoiceRows] = useState(() => buildFallback(clientCode).invoiceRows)
  const [paymentRows, setPaymentRows] = useState(() => buildFallback(clientCode).paymentRows)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadClientDetail() {
      try {
        const [detailPayload, invoicesPayload, paymentsPayload] = await Promise.all([
          fetchJson(`/api/clients/${encodeURIComponent(clientCode)}/detail`),
          fetchJson(`/api/clients/${encodeURIComponent(clientCode)}/invoices`),
          fetchJson(`/api/clients/${encodeURIComponent(clientCode)}/payments`),
        ])

        if (!isActive) {
          return
        }

        setSummary(detailPayload?.summary ?? buildFallback(clientCode).summary)
        setInvoiceRows(invoicesPayload?.invoiceRows ?? [])
        setPaymentRows(paymentsPayload?.paymentRows ?? [])
        setLoadError('')
      } catch {
        if (!isActive) {
          return
        }

        const fallback = buildFallback(clientCode)
        setSummary(fallback.summary)
        setInvoiceRows(fallback.invoiceRows)
        setPaymentRows(fallback.paymentRows)
        setLoadError('Live data unavailable. Showing fallback dataset.')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadClientDetail()

    return () => {
      isActive = false
    }
  }, [clientCode])

  const detailItems = useMemo(() => ([
    { label: 'Client', value: summary.name },
    { label: 'Contact', value: summary.contact },
    { label: 'Total AR', value: summary.totalOutstanding },
    { label: 'Status', value: summary.status?.label ?? fallbackStatus.label },
    { label: 'Invoices', value: summary.totalInvoices },
    { label: 'Payments', value: summary.totalPayments },
  ]), [summary])

  const detailPanel = {
    title: 'Client profile',
    subtitle: 'Real-time account context and collections signals.',
    content: (
      <Surface compact glass title="Account summary" eyebrow={summary.id}>
        <DetailList items={detailItems} />
      </Surface>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: shellBrandTitle,
        copy: clientsCopy.brandCopy,
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">Client Detail</span>
            <h2 className="page-title">{summary.name}</h2>
            <p className="page-copy">Invoice and payment history for this client account.</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{isLoading ? 'Loading client detail...' : summary.id}</span>
            <Button size="sm" variant="secondary" onClick={() => shell.onNavigate({ path: '/clients' })}>Back to Clients</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        {loadError ? <p className="page-copy">{loadError}</p> : null}
        <SectionContainer
          eyebrow="Invoices"
          title="Client invoices"
          description="Most recent invoices associated with this client."
        >
          <DataTable
            columns={invoiceColumns}
            description="Sorted by billed date, newest first."
            rows={invoiceRows}
            title="Invoice history"
          />
        </SectionContainer>

        <SectionContainer
          eyebrow="Payments"
          title="Payment history"
          description="Payment transactions applied across this client account."
        >
          <DataTable
            columns={paymentColumns}
            description="Grouped by payment code with allocation count."
            rows={paymentRows}
            title="Payments"
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default ClientDetailPage
