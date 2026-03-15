import { useNavigate } from 'react-router-dom'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import ReadOnlyModeBanner from '../components/domain/ReadOnlyModeBanner'
import SectionContainer from '../components/composition/SectionContainer'
import MetricsGrid from '../components/composition/MetricsGrid'
import StatCard from '../components/data-display/StatCard'
import AgingBucketCard from '../components/domain/AgingBucketCard'
import Timeline from '../components/data-display/Timeline'
import DetailList from '../components/composition/DetailList'
import dashboardSampleData from './data/dashboardSampleData.json'

const {
  agingBuckets: dashboardAgingBuckets,
  heroMetrics: dashboardHeroMetrics,
  statCards: dashboardStatCards,
  timelineItems: dashboardTimelineItems,
} = dashboardSampleData

function DashboardPage({ shell }) {
  const navigate = useNavigate()

  const detailPanel = {
    title: 'Dashboard context',
    subtitle: 'A compact summary rail for daily cashflow and review pressure before drilling into screens.',
    content: (
      <>
        <Surface compact glass title="Today at a glance" eyebrow="Ops summary">
          <DetailList
            items={[
              { label: 'Open receivables', value: '$184,220' },
              { label: 'Pending approvals', value: '17 items' },
              { label: '120+ Day balance', value: '$15,940' },
              { label: 'Net inflow', value: '$41,880' },
            ]}
          />
        </Surface>
        <Timeline
          description="Fast context from activity affecting AR and review workload."
          items={dashboardTimelineItems.slice(0, 3)}
          title="Recent updates"
        />
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: 'AR Billing Tracker',
        copy: 'Dashboard shell split from preview composition.',
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">Dashboard</span>
            <h2 className="page-title">AR and operations snapshot</h2>
            <p className="page-copy">
              Metrics and aging status extracted from the preview gallery as the new route-level home screen.
            </p>
          </div>
          <div className="page-actions">
            <span className="page-badge">Updated 15 Mar 2026</span>
            <Button onClick={() => navigate('/review')} size="sm" variant="secondary">Open review inbox</Button>
            <Button leadingDot onClick={() => navigate('/aging')} size="sm">Inspect AR aging</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <ReadOnlyModeBanner />

        <section className="section-grid section-grid--hero">
          <Surface
            description="This route-level dashboard reuses the established panel language while keeping data static for now."
            eyebrow="Overview"
            title="Command center"
          >
            <div className="button-row">
              <Button onClick={() => navigate('/aging')} leadingDot>Open AR Aging</Button>
              <Button onClick={() => navigate('/review')} variant="secondary">Open Review Inbox</Button>
              <Button onClick={() => navigate('/clients')} variant="ghost">Open Client List</Button>
            </div>
          </Surface>

          <Surface glass title="Hero metrics" eyebrow="At a glance">
            <MetricsGrid items={dashboardHeroMetrics} />
          </Surface>
        </section>

        <SectionContainer
          description="Primary receivables and operational pressure indicators."
          eyebrow="Metrics"
          title="Key AR signals"
        >
          <div className="section-grid section-grid--stats">
            {dashboardStatCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>
          <div className="section-grid section-grid--age">
            {dashboardAgingBuckets.map((bucket) => (
              <AgingBucketCard key={bucket.label} {...bucket} />
            ))}
          </div>
        </SectionContainer>

        <section className="section-grid section-grid--timeline">
          <Timeline
            description="Route-level timeline retained from the preview while backend feeds are pending."
            items={dashboardTimelineItems}
            title="Recent cashflow and review activity"
          />

          <Surface eyebrow="Next actions" title="Recommended follow-ups">
            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-label">Aging review</span>
                <strong>4 invoices crossed 120+ days</strong>
              </div>
              <div className="detail-row">
                <span className="detail-label">Approval load</span>
                <strong>17 items waiting in review inbox</strong>
              </div>
              <div className="detail-row">
                <span className="detail-label">Outreach</span>
                <strong>9 reminders due before next business day</strong>
              </div>
            </div>
          </Surface>
        </section>
      </div>
    </AppShell>
  )
}

export default DashboardPage