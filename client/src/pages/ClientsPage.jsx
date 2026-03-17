import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Badge from '../components/primitives/Badge'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import Timeline from '../components/data-display/Timeline'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import MetricsGrid from '../components/composition/MetricsGrid'
import clientsSampleData from './data/clientsSampleData.json'
import pageCopy from './data/pageCopy.json'
import { normalizeClientsSampleData } from '../utils/sampleDataContracts'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { fetchJson } from '../utils/apiClient'

const clientsCopy = normalizePageCopy('clients', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)
const fallbackStatus = { label: 'Unknown', tone: 'muted' }

const columns = [
  {
    key: 'name',
    label: 'Client',
    render: (row) => (
      <div className="table-primary">
        <strong>{row.name}</strong>
        <span className="table-meta">{row.id}</span>
      </div>
    ),
  },
  { key: 'contact', label: 'Contact' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const status = row?.status ?? fallbackStatus
      return <Badge tone={status.tone}>{status.label}</Badge>
    },
  },
  { key: 'totalOutstanding', label: 'Outstanding', align: 'right', mono: true },
  { key: 'daysPastDue', label: 'Days Past Due', align: 'right' },
  { key: 'lastPaymentDate', label: 'Last Payment' },
  { key: 'paymentHistory', label: 'On-time Rate' },
]

function ClientsPage({ shell }) {
  const [clientsData, setClientsData] = useState(() => normalizeClientsSampleData(clientsSampleData))
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const { clientMetrics, clientRows, timelineItems } = clientsData
  const [selectedClientId, setSelectedClientId] = useState(clientRows[0]?.id)

  useEffect(() => {
    let isActive = true

    async function loadClients() {
      try {
        const payload = await fetchJson('/api/clients')
        if (!isActive) {
          return
        }

        const normalized = normalizeClientsSampleData(payload)
        setClientsData(normalized)
        setSelectedClientId(normalized.clientRows[0]?.id)
        setLoadError('')
      } catch {
        if (!isActive) {
          return
        }

        setClientsData(normalizeClientsSampleData(clientsSampleData))
        setLoadError('Live data unavailable. Showing sample dataset.')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadClients()

    return () => {
      isActive = false
    }
  }, [])

  const selectedClient = useMemo(
    () => clientRows.find((row) => row.id === selectedClientId) ?? clientRows[0],
    [clientRows, selectedClientId],
  )

  const detailPanel = {
    title: clientsCopy.detailPanel.title,
    subtitle: clientsCopy.detailPanel.subtitle,
    content: (
      <>
        <Surface
          compact
          glass
          title={clientsCopy.detailPanel.summaryTitle}
          eyebrow={selectedClient?.id ?? clientsCopy.detailPanel.summaryEyebrow}
        >
          <DetailList
            items={[
              { label: 'Client', value: selectedClient?.name },
              { label: 'Contact', value: selectedClient?.contact },
              { label: 'Total AR', value: selectedClient?.totalOutstanding },
              { label: 'Status', value: selectedClient?.status?.label ?? fallbackStatus.label },
            ]}
          />
        </Surface>
        <Timeline
          description={clientsCopy.detailPanel.timelineDescription}
          items={timelineItems.slice(0, 3)}
          title={clientsCopy.detailPanel.timelineTitle}
        />
      </>
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
            <span className="eyebrow">{clientsCopy.topBar.eyebrow}</span>
            <h2 className="page-title">{clientsCopy.topBar.title}</h2>
            <p className="page-copy">{clientsCopy.topBar.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{isLoading ? 'Loading live data...' : clientsCopy.topBar.badge}</span>
            {clientsCopy.topBar.actions.map((action) => (
              <Button key={action.label} size={action.size} variant={action.variant}>{action.label}</Button>
            ))}
          </div>
        </header>
      }
    >
      <div className="page-stack">
        {loadError ? <p className="page-copy">{loadError}</p> : null}
        <SectionContainer
          description={clientsCopy.metricsSection.description}
          eyebrow={clientsCopy.metricsSection.eyebrow}
          title={clientsCopy.metricsSection.title}
        >
          <MetricsGrid items={clientMetrics} />
        </SectionContainer>

        <SectionContainer
          description={clientsCopy.sections.clientTable.description}
          eyebrow={clientsCopy.sections.clientTable.eyebrow}
          title={clientsCopy.sections.clientTable.title}
        >
          <DataTable
            actions={
              <div className="toolbar-group">
                {clientsCopy.sections.clientTable.tableActions.map((action) => (
                  <Button key={action.label} size={action.size} variant={action.variant}>{action.label}</Button>
                ))}
              </div>
            }
            columns={columns}
            description={clientsCopy.sections.clientTable.tableDescription}
            onRowClick={(rowId) => {
              setSelectedClientId(rowId)
              shell.onNavigate({ path: `/clients/${encodeURIComponent(rowId)}` })
            }}
            rowSelectionEnabled
            rows={clientRows}
            selectedRowId={selectedClientId}
            title={clientsCopy.sections.clientTable.tableTitle}
          />
        </SectionContainer>

        <SectionContainer
          description={clientsCopy.sections.paymentHistory.description}
          eyebrow={clientsCopy.sections.paymentHistory.eyebrow}
          title={clientsCopy.sections.paymentHistory.title}
        >
          <Timeline
            description={clientsCopy.sections.paymentHistory.timelineDescription}
            items={timelineItems}
            title={clientsCopy.sections.paymentHistory.timelineTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default ClientsPage