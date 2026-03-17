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
import DashboardVisuals from '../components/data-display/DashboardVisuals'
import DetailList from '../components/composition/DetailList'
import dashboardSampleData from './data/dashboardSampleData.json'
import pageCopy from './data/pageCopy.json'
import { normalizeDashboardSampleData } from '../utils/sampleDataContracts'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'

const normalizedDashboardData = normalizeDashboardSampleData(dashboardSampleData)

const {
  agingBuckets: dashboardAgingBuckets,
  heroMetrics: dashboardHeroMetrics,
  statCards: dashboardStatCards,
  timelineItems: dashboardTimelineItems,
  agingVisualBuckets,
  bucketClientBreakdown,
  cashFlowByPeriod,
} = normalizedDashboardData

const dashboardCopy = normalizePageCopy('dashboard', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

function DashboardPage({ shell }) {
  const navigate = useNavigate()

  const detailPanel = {
    title: dashboardCopy.detailPanel.title,
    subtitle: dashboardCopy.detailPanel.subtitle,
    content: (
      <>
        <Surface
          compact
          glass
          title={dashboardCopy.detailPanel.summaryTitle}
          eyebrow={dashboardCopy.detailPanel.summaryEyebrow}
        >
          <DetailList items={dashboardCopy.detailPanel.summaryItems} />
        </Surface>
        <Timeline
          description={dashboardCopy.detailPanel.timelineDescription}
          items={dashboardTimelineItems.slice(0, 3)}
          title={dashboardCopy.detailPanel.timelineTitle}
        />
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: shellBrandTitle,
        copy: dashboardCopy.brandCopy,
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{dashboardCopy.topBar.eyebrow}</span>
            <h2 className="page-title">{dashboardCopy.topBar.title}</h2>
            <p className="page-copy">{dashboardCopy.topBar.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{dashboardCopy.topBar.badge}</span>
            {dashboardCopy.topBar.actions.map((action) => (
              <Button
                key={action.label}
                leadingDot={Boolean(action.leadingDot)}
                onClick={() => navigate(action.path)}
                size={action.size}
                variant={action.variant}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <ReadOnlyModeBanner />

        <DashboardVisuals
          agingVisualBuckets={agingVisualBuckets}
          bucketClientBreakdown={bucketClientBreakdown}
          cashFlowByPeriod={cashFlowByPeriod}
        />

        <section className="section-grid section-grid--hero">
          <Surface
            description={dashboardCopy.hero.description}
            eyebrow={dashboardCopy.hero.eyebrow}
            title={dashboardCopy.hero.title}
          >
            <div className="button-row">
              {dashboardCopy.hero.actions.map((action) => (
                <Button
                  key={action.label}
                  leadingDot={Boolean(action.leadingDot)}
                  onClick={() => navigate(action.path)}
                  variant={action.variant}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Surface>

          <Surface glass title={dashboardCopy.heroMetrics.title} eyebrow={dashboardCopy.heroMetrics.eyebrow}>
            <MetricsGrid items={dashboardHeroMetrics} />
          </Surface>
        </section>

        <SectionContainer
          description={dashboardCopy.metricsSection.description}
          eyebrow={dashboardCopy.metricsSection.eyebrow}
          title={dashboardCopy.metricsSection.title}
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
            description={dashboardCopy.timeline.description}
            items={dashboardTimelineItems}
            title={dashboardCopy.timeline.title}
          />

          <Surface eyebrow={dashboardCopy.nextActions.eyebrow} title={dashboardCopy.nextActions.title}>
            <div className="detail-list">
              {dashboardCopy.nextActions.items.map((item) => (
                <div className="detail-row" key={item.label}>
                  <span className="detail-label">{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </Surface>
        </section>
      </div>
    </AppShell>
  )
}

export default DashboardPage