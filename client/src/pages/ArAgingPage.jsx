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

const { agingBuckets, invoiceRows, timelineItems: agingTimelineItems } = agingSampleData

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
    title: 'Invoice detail',
    subtitle: 'Contextual summary for the selected aging record and related activity.',
    content: (
      <>
        <Surface compact glass title="Selected invoice" eyebrow="INV-24031">
          <DetailList
            items={[
              { label: 'Client', value: 'M. Ortega' },
              { label: 'Company', value: 'BlueCross' },
              { label: 'Billed', value: '$1,420.00' },
              { label: 'Received', value: '$980.00' },
            ]}
          />
        </Surface>
        <Timeline
          description="Recent events tied to the selected record and its follow-up work."
          items={agingTimelineItems}
          title="Invoice activity"
        />
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: 'AR Billing Tracker',
        copy: 'Aging workspace route split from the preview gallery.',
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">AR Aging</span>
            <h2 className="page-title">Bucket drill-down and invoice ledger</h2>
            <p className="page-copy">
              Receivables are grouped by billing age with rapid actions for escalation, exports, and follow-ups.
            </p>
          </div>
          <div className="page-actions">
            <span className="page-badge">Live sample dataset</span>
            <Button size="sm" variant="ghost">Export aging</Button>
            <Button size="sm" variant="secondary">Mark uncollectible</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer
          description="Shared bucket cards preserved from preview for consistent cross-screen AR summaries."
          eyebrow="Bucket summary"
          title="Aging distribution"
        >
          <div className="section-grid section-grid--age">
            {agingBuckets.map((bucket) => (
              <AgingBucketCard key={bucket.label} {...bucket} />
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          description="Primary ledger table for AR records, preserving status rendering and compact grid density."
          eyebrow="Ledger"
          title="Aging invoice table"
        >
          <DataTable
            actions={
              <div className="toolbar-group">
                <Button size="sm" variant="ghost">Filter overdue</Button>
                <Button size="sm" variant="secondary">Open reminders</Button>
              </div>
            }
            columns={columns}
            description="Date billed drives aging buckets and action prioritization."
            rows={invoiceRows}
            title="Open invoices"
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default ArAgingPage