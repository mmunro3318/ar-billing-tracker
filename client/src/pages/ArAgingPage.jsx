import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Badge from '../components/primitives/Badge'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import Timeline from '../components/data-display/Timeline'
import AgingBucketCard from '../components/domain/AgingBucketCard'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import agingSampleData from './data/agingSampleData.json'
import pageCopy from './data/pageCopy.json'

const { agingBuckets, invoiceRows, timelineItems: agingTimelineItems } = agingSampleData
const agingCopy = pageCopy.aging

const invoiceColumns = [
  { key: 'client', label: 'Client' },
  { key: 'serviceDate', label: 'Date Billed' },
  { key: 'company', label: 'Company' },
  { key: 'billedAmount', label: 'Billed', align: 'right', mono: true },
  { key: 'receivedAmount', label: 'Received', align: 'right', mono: true },
]

const columns = [
  {
    key: 'client',
    label: 'Client',
    render: (row) => (
      <div className="table-primary">
        <strong>{row.client}</strong>
        <span className="table-meta">{row.id}</span>
      </div>
    ),
  },
  ...invoiceColumns.filter((column) => column.key !== 'client'),
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge tone={row.status.tone}>{row.status.label}</Badge>,
  },
]

function ArAgingPage({ shell }) {
  const detailPanel = {
    title: agingCopy.detailPanel.title,
    subtitle: agingCopy.detailPanel.subtitle,
    content: (
      <>
        <Surface
          compact
          glass
          title={agingCopy.detailPanel.summaryTitle}
          eyebrow={agingCopy.detailPanel.summaryEyebrow}
        >
          <DetailList items={agingCopy.detailPanel.summaryItems} />
        </Surface>
        <Timeline
          description={agingCopy.detailPanel.timelineDescription}
          items={agingTimelineItems}
          title={agingCopy.detailPanel.timelineTitle}
        />
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: pageCopy.shell.brandTitle,
        copy: agingCopy.brandCopy,
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{agingCopy.topBar.eyebrow}</span>
            <h2 className="page-title">{agingCopy.topBar.title}</h2>
            <p className="page-copy">{agingCopy.topBar.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{agingCopy.topBar.badge}</span>
            {agingCopy.topBar.actions.map((action) => (
              <Button key={action.label} size={action.size} variant={action.variant}>{action.label}</Button>
            ))}
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer
          description={agingCopy.sections.buckets.description}
          eyebrow={agingCopy.sections.buckets.eyebrow}
          title={agingCopy.sections.buckets.title}
        >
          <div className="section-grid section-grid--age">
            {agingBuckets.map((bucket) => (
              <AgingBucketCard key={bucket.label} {...bucket} />
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          description={agingCopy.sections.ledger.description}
          eyebrow={agingCopy.sections.ledger.eyebrow}
          title={agingCopy.sections.ledger.title}
        >
          <DataTable
            actions={
              <div className="toolbar-group">
                {agingCopy.sections.ledger.tableActions.map((action) => (
                  <Button key={action.label} size={action.size} variant={action.variant}>{action.label}</Button>
                ))}
              </div>
            }
            columns={columns}
            description={agingCopy.sections.ledger.tableDescription}
            rows={invoiceRows}
            title={agingCopy.sections.ledger.tableTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default ArAgingPage