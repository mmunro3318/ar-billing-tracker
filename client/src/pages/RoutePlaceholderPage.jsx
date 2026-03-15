import AppShell from '../components/shell/AppShell'
import Surface from '../components/primitives/Surface'
import Button from '../components/primitives/Button'
import EmptyStatePanel from '../components/composition/EmptyStatePanel'
import SectionContainer from '../components/composition/SectionContainer'

function RoutePlaceholderPage({ shell, eyebrow, title, description, message }) {
  const detailPanel = {
    title,
    subtitle: 'Route shell is active with placeholder content until this screen gets domain extraction.',
    content: (
      <Surface compact glass title="Planned implementation" eyebrow="Next up">
        <div className="detail-list">
          <div className="detail-row">
            <span className="detail-label">State</span>
            <strong>Routing complete</strong>
          </div>
          <div className="detail-row">
            <span className="detail-label">Page</span>
            <strong>{title}</strong>
          </div>
          <div className="detail-row">
            <span className="detail-label">Next step</span>
            <strong>Extract domain sections from preview patterns</strong>
          </div>
        </div>
      </Surface>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: 'AR Billing Tracker',
        copy: 'Route placeholders keep navigation and app-shell behavior testable end-to-end.',
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="page-title">{title}</h2>
            <p className="page-copy">{description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">Placeholder route</span>
            <Button onClick={() => shell.onNavigate({ path: '/dashboard' })} size="sm" variant="secondary">Back to Dashboard</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer
          description="This route intentionally ships as a thin placeholder in the first routing/screen split cycle."
          eyebrow="Scaffold"
          title="Screen in progress"
        >
          <EmptyStatePanel
            description="Use this route to validate URL navigation, responsive shell behavior, and active nav state."
            eyebrow="Coming next"
            message={message}
            title={title}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default RoutePlaceholderPage