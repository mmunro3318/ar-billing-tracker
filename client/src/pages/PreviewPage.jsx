import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Badge from '../components/primitives/Badge'
import Surface from '../components/primitives/Surface'
import InlineAlert from '../components/primitives/InlineAlert'
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextInput,
  ToggleField,
} from '../components/primitives/Fields'
import StatCard from '../components/data-display/StatCard'
import DataTable from '../components/data-display/DataTable'
import Timeline from '../components/data-display/Timeline'
import AuditDiffRow from '../components/data-display/AuditDiffRow'
import AgingBucketCard from '../components/domain/AgingBucketCard'
import ReadOnlyModeBanner from '../components/domain/ReadOnlyModeBanner'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import FormSection from '../components/composition/FormSection'
import MetricsGrid from '../components/composition/MetricsGrid'
import AuthPanel from '../components/composition/AuthPanel'
import EmptyStatePanel from '../components/composition/EmptyStatePanel'
import { NAV_ITEMS } from '../routes/appRoutes'
import previewSampleData from './data/previewSampleData.json'

const {
  agingBuckets,
  invoiceRows,
  reviewRows,
  statCards,
  timelineItems,
} = previewSampleData

const invoiceColumns = [
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
  { key: 'serviceDate', label: 'Date Billed' },
  { key: 'company', label: 'Company' },
  { key: 'billedAmount', label: 'Billed', align: 'right', mono: true },
  { key: 'receivedAmount', label: 'Received', align: 'right', mono: true },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge tone={row.status.tone}>{row.status.label}</Badge>,
  },
]

const reviewColumns = [
  { key: 'type', label: 'Type' },
  { key: 'subject', label: 'Subject' },
  { key: 'user', label: 'Submitted By' },
  { key: 'submittedAt', label: 'Submitted At' },
  { key: 'change', label: 'Diff Preview' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge tone={row.status.tone}>{row.status.label}</Badge>,
  },
]

const detailPanel = {
  title: 'Invoice detail',
  subtitle: 'Contextual panel modeled after the reference sidebars for audit and payment history.',
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
        description="The right rail can swap between audit, history, and reminder context."
        items={timelineItems.slice(0, 3)}
        title="Recent activity"
      />
    </>
  ),
}

function PreviewPage({ shell }) {
  const activeKey = shell?.activeKey ?? 'aging'
  const navItems = shell?.navItems ?? NAV_ITEMS
  const onNavigate = shell?.onNavigate

  return (
    <AppShell
      activeKey={activeKey}
      brand={{
        title: 'AR Billing Tracker',
        copy: 'Reusable preview gallery for the initial component system.',
      }}
      navItems={navItems}
      onNavSelect={onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">Single Preview Page</span>
            <h2 className="page-title">Core UI system scaffold</h2>
            <p className="page-copy">
              This preview exercises the first reusable components against AR aging, review, auth,
              and read-only states while staying anchored to the dark neumorphic style guide.
            </p>
          </div>
          <div className="page-actions">
            <span className="page-badge">Updated 15 Mar 2026</span>
            <Button size="sm" variant="secondary">Export preview notes</Button>
            <Button leadingDot size="sm">Primary action</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <ReadOnlyModeBanner />

        <section className="section-grid section-grid--hero">
          <Surface
            description="A single gallery page groups the foundational elements first, then shows how they compose into billing-specific widgets."
            eyebrow="Foundations"
            title="System direction"
          >
            <div className="button-row">
              <Button leadingDot>Primary button</Button>
              <Button variant="secondary">Secondary button</Button>
              <Button variant="ghost">Ghost action</Button>
              <Button variant="danger">Deny selected</Button>
            </div>
            <div className="badge-row">
              <Badge tone="accent">Pending Review</Badge>
              <Badge tone="success">Paid</Badge>
              <Badge tone="warning">Overdue</Badge>
              <Badge tone="danger">120+ Days</Badge>
              <Badge tone="muted" mono>INV-24031</Badge>
            </div>
          </Surface>

          <Surface glass title="Hero metrics" eyebrow="At a glance">
            <MetricsGrid
              items={[
                { label: 'Approval SLA', value: '2h 14m' },
                { label: 'Avg days in AR', value: '46.2' },
                { label: 'Claims flagged', value: '11' },
                { label: 'Net inflow', value: '$41,880' },
              ]}
            />
          </Surface>
        </section>

        <SectionContainer
          description="These cards carry the same shadow language and status tones used elsewhere in the system."
          eyebrow="Metrics"
          title="Stat cards and aging buckets"
        >
          <div className="section-grid section-grid--stats">
            {statCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>
          <div className="section-grid section-grid--age">
            {agingBuckets.map((bucket) => (
              <AgingBucketCard key={bucket.label} {...bucket} />
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          description="Inputs stay restrained and dark, letting the accent blue show state rather than decoration."
          eyebrow="Forms"
          title="Entry, filter, and approval controls"
        >
          <div className="section-grid section-grid--forms">
            <FormSection className="span-8" title="Billing entry form" eyebrow="Form primitives">
                <TextInput defaultValue="M. Ortega" label="Client name" meta="Required" />
                <SelectField
                  label="Company"
                  options={[
                    { value: 'bluecross', label: 'BlueCross' },
                    { value: 'aetna', label: 'Aetna' },
                    { value: 'cigna', label: 'Cigna' },
                  ]}
                />
                <TextInput defaultValue="03/02/2026" label="Date billed" />
                <TextInput defaultValue="$1,420.00" label="Billed amount" />
                <TextAreaField
                  label="Notes"
                  meta="Timeline copy"
                  defaultValue="Claim pending secondary follow-up after partial payment receipt."
                />
                <div className="check-grid">
                  <ToggleField copy="Disable edits when connection drops." defaultChecked label="Read-only safeguard" />
                  <CheckboxField copy="Require admin review for non-admin edits." defaultChecked label="Pending approval" />
                </div>
            </FormSection>

            <FormSection className="span-4" glass title="Filters" eyebrow="Table toolbar">
                <TextInput defaultValue="Ortega" label="Search client" />
                <SelectField
                  label="Aging bucket"
                  options={[
                    { value: 'all', label: 'All buckets' },
                    { value: '90', label: '90 days' },
                    { value: '120', label: '120+ days' },
                  ]}
                />
                <SelectField
                  label="Role view"
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'data-entry', label: 'Data Entry' },
                  ]}
                />
                <SelectField
                  label="Export target"
                  options={[
                    { value: 'excel', label: 'Excel' },
                    { value: 'pdf', label: 'PDF' },
                    { value: 'drive', label: 'Google Drive' },
                  ]}
                />
            </FormSection>
          </div>
        </SectionContainer>

        <SectionContainer
          description="The central workspace uses a dense data-grid treatment with hover states and contextual status tags."
          eyebrow="Data Display"
          title="Tables, queues, and timelines"
        >
          <div className="section-grid section-grid--tables">
            <DataTable
              actions={
                <div className="toolbar-group">
                  <Button size="sm" variant="ghost">Export aging</Button>
                  <Button size="sm" variant="secondary">Mark uncollectible</Button>
                </div>
              }
              columns={invoiceColumns}
              description="Primary invoice table preview for the AR aging workspace."
              rows={invoiceRows}
              title="Invoice ledger"
            />
            <DataTable
              actions={
                <div className="toolbar-group">
                  <Button size="sm">Approve selected</Button>
                  <Button size="sm" variant="danger">Deny selected</Button>
                </div>
              }
              columns={reviewColumns}
              description="Admin review inbox for entries created by non-admin users."
              rows={reviewRows}
              title="Pending changes queue"
            />
          </div>
        </SectionContainer>

        <section className="section-grid section-grid--timeline">
          <Timeline
            description="Mirrors the timeline suggestion from the style guide for reminders, payments, and operational events."
            items={timelineItems}
            title="Payment history and reminders"
          />

          <Surface title="Audit diffs" eyebrow="Admin review">
            <AuditDiffRow
              actor="M. Ibarra"
              after="$1,420.00"
              before="$1,220.00"
              label="Billed amount correction"
              timestamp="Today 09:21"
            />
            <AuditDiffRow
              actor="M. Ibarra"
              after="$320.00"
              before="$0.00"
              label="Payment receipt posted"
              timestamp="Today 08:47"
            />
            <AuditDiffRow
              actor="C. Vega"
              after="Uncollectible"
              before="120+ Days"
              label="Bucket reassignment"
              timestamp="Yesterday 03:16"
            />
          </Surface>
        </section>

        <SectionContainer
          description="These surfaces stay within the same visual language instead of becoming a separate theme."
          eyebrow="Feedback and Session"
          title="Auth, lock, and system status surfaces"
        >
          <div className="section-grid section-grid--feedback">
            <AuthPanel
              description="Browser-based secure access with the same component primitives used elsewhere in the app."
              eyebrow="Authentication"
              glass
              title="Login panel"
            >
              <TextInput defaultValue="admin@clinic.local" label="Username" />
              <TextInput defaultValue="••••••••••" label="Password" type="password" />
              <div className="button-row">
                <Button>Sign in</Button>
                <Button variant="secondary">Use backup code</Button>
              </div>
            </AuthPanel>

            <AuthPanel eyebrow="Session continuity" title="Two-factor and lock screen">
              <span className="auth-code">183 294</span>
              <TextInput defaultValue="183294" label="2FA code" meta="SMS or email" />
              <InlineAlert tone="warning" title="Idle timeout in 00:43">
                Re-enter your password to continue approving items without losing your place in the queue.
              </InlineAlert>
              <div className="button-row">
                <Button>Unlock session</Button>
                <Button variant="ghost">Resend code</Button>
              </div>
            </AuthPanel>

            <Surface className="span-6" title="System notices" eyebrow="Inline feedback">
              <InlineAlert tone="accent" title="AdvancedMD sync queued">
                Delta import will begin after the current approval batch finishes.
              </InlineAlert>
              <InlineAlert tone="warning" title="3 invoices require follow-up">
                These items crossed the 90-day threshold and should trigger reminder outreach.
              </InlineAlert>
              <InlineAlert tone="danger" title="Save actions unavailable">
                Connectivity remains unstable, so write operations are disabled until the connection recovers.
              </InlineAlert>
            </Surface>

            <EmptyStatePanel
              description="Clear filters or switch roles to preview alternate review states."
              eyebrow="Fallback shell"
              message="No pending approvals match this filter set."
              title="Empty state"
            />
          </div>
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default PreviewPage