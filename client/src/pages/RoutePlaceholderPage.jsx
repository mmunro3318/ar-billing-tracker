import AppShell from '../components/shell/AppShell'
import Surface from '../components/primitives/Surface'
import Button from '../components/primitives/Button'
import EmptyStatePanel from '../components/composition/EmptyStatePanel'
import SectionContainer from '../components/composition/SectionContainer'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'

const placeholderCopy = normalizePageCopy('placeholders', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

function RoutePlaceholderPage({ shell, pageKey }) {
  const routeContent = placeholderCopy.routes[pageKey] ?? {
    eyebrow: 'Route',
    title: 'Unknown route',
    description: 'No placeholder copy is defined for this route key yet.',
    message: 'Add placeholder route copy in pageCopy.json to define this screen.',
  }

  const detailPanel = {
    title: routeContent.title,
    subtitle: placeholderCopy.detailPanel.subtitle,
    content: (
      <Surface
        compact
        glass
        title={placeholderCopy.detailPanel.title}
        eyebrow={placeholderCopy.detailPanel.eyebrow}
      >
        <div className="detail-list">
          {placeholderCopy.detailPanel.items.map((item) => {
            const value = item.value === '{{title}}' ? routeContent.title : item.value

            return (
              <div className="detail-row" key={item.label}>
                <span className="detail-label">{item.label}</span>
                <strong>{value}</strong>
              </div>
            )
          })}
        </div>
      </Surface>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: shellBrandTitle,
        copy: placeholderCopy.brandCopy,
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{routeContent.eyebrow}</span>
            <h2 className="page-title">{routeContent.title}</h2>
            <p className="page-copy">{routeContent.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{placeholderCopy.topBar.badge}</span>
            <Button onClick={() => shell.onNavigate({ path: '/dashboard' })} size="sm" variant="secondary">
              {placeholderCopy.topBar.backToDashboard}
            </Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer
          description={placeholderCopy.section.description}
          eyebrow={placeholderCopy.section.eyebrow}
          title={placeholderCopy.section.title}
        >
          <EmptyStatePanel
            description={placeholderCopy.emptyState.description}
            eyebrow={placeholderCopy.emptyState.eyebrow}
            message={routeContent.message}
            title={routeContent.title}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default RoutePlaceholderPage