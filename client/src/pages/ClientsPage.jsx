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

const { clientMetrics, clientRows, selectedClientSummary, timelineItems } = clientsSampleData
const clientsCopy = pageCopy.clients

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
    render: (row) => <Badge tone={row.status.tone}>{row.status.label}</Badge>,
  },
  { key: 'totalOutstanding', label: 'Outstanding', align: 'right', mono: true },
  { key: 'daysPastDue', label: 'Days Past Due', align: 'right' },
  { key: 'lastPaymentDate', label: 'Last Payment' },
  { key: 'paymentHistory', label: 'On-time Rate' },
]

function ClientsPage({ shell }) {
  const detailPanel = {
    title: clientsCopy.detailPanel.title,
    subtitle: clientsCopy.detailPanel.subtitle,
    content: (
      <>
        <Surface
          compact
          glass
          title={clientsCopy.detailPanel.summaryTitle}
          eyebrow={clientsCopy.detailPanel.summaryEyebrow}
        >
          <DetailList items={selectedClientSummary} />
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
        title: pageCopy.shell.brandTitle,
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
            <span className="page-badge">{clientsCopy.topBar.badge}</span>
            {clientsCopy.topBar.actions.map((action) => (
              <Button key={action.label} size={action.size} variant={action.variant}>{action.label}</Button>
            ))}
          </div>
        </header>
      }
    >
      <div className="page-stack">
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
            rows={clientRows}
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