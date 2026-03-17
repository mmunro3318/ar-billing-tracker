import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import SectionContainer from '../components/composition/SectionContainer'
import StatCard from '../components/data-display/StatCard'
import AgingBucketCard from '../components/domain/AgingBucketCard'
import Timeline from '../components/data-display/Timeline'
import DashboardVisuals from '../components/data-display/DashboardVisuals'
import DetailList from '../components/composition/DetailList'
import dashboardSampleData from './data/dashboardSampleData.json'
import pageCopy from './data/pageCopy.json'
import { normalizeDashboardSampleData } from '../utils/sampleDataContracts'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { fetchJson } from '../utils/apiClient'

const dashboardCopy = normalizePageCopy('dashboard', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

function DashboardPage({ shell }) {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(() => normalizeDashboardSampleData(dashboardSampleData))
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const {
    agingBuckets: dashboardAgingBuckets,
    statCards: dashboardStatCards,
    timelineItems: dashboardTimelineItems,
    agingVisualBuckets,
    bucketClientBreakdown,
    cashFlowByPeriod,
  } = dashboardData

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      try {
        const payload = await fetchJson('/api/dashboard')
        if (!isActive) {
          return
        }

        setDashboardData(normalizeDashboardSampleData(payload))
        setLoadError('')
      } catch {
        if (!isActive) {
          return
        }

        setDashboardData(normalizeDashboardSampleData(dashboardSampleData))
        setLoadError('Live data unavailable. Showing sample dataset.')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isActive = false
    }
  }, [])

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
            <span className="page-badge">{isLoading ? 'Loading live data...' : dashboardCopy.topBar.badge}</span>
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
        {loadError ? <p className="page-copy">{loadError}</p> : null}

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

        <DashboardVisuals
          agingVisualBuckets={agingVisualBuckets}
          bucketClientBreakdown={bucketClientBreakdown}
          cashFlowByPeriod={cashFlowByPeriod}
        />

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