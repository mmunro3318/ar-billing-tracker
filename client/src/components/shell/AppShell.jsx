import { useState } from 'react'

function LeftSidebarNav({ items, activeKey, onSelect }) {
  const [expandedGroups, setExpandedGroups] = useState({})

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const isParentActive = (item) => {
    if (item.key === activeKey) {
      return true
    }

    return Array.isArray(item.children) && item.children.some((child) => child.key === activeKey)
  }

  return (
    <nav className="sidebar-nav" aria-label="Primary">
      {items.map((item) => {
        const hasChildren = Array.isArray(item.children) && item.children.length > 0
        const hasActiveChild = Array.isArray(item.children)
          && item.children.some((child) => child.key === activeKey)
        const isExpanded = Boolean(expandedGroups[item.key]) || hasActiveChild
        const parentActive = isParentActive(item)

        return (
          <div className="nav-group" key={item.key}>
            <button
              className={`nav-item ${hasChildren ? 'nav-item--parent' : ''} ${parentActive ? 'is-active' : ''}`.trim()}
              onClick={() => {
                if (hasChildren) {
                  toggleGroup(item.key)
                  return
                }

                onSelect?.(item)
              }}
              type="button"
            >
              <span aria-hidden="true" className="nav-icon" />
              <span className="nav-copy">
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
              </span>
              {hasChildren ? <span aria-hidden="true" className="nav-chevron">{isExpanded ? '-' : '+'}</span> : null}
            </button>

            {hasChildren && isExpanded ? (
              <div className="nav-children" role="group" aria-label={item.label}>
                {item.children.map((child) => (
                  <button
                    key={child.key}
                    className={`nav-item nav-item--child ${child.key === activeKey ? 'is-active' : ''}`.trim()}
                    onClick={() => onSelect?.(child)}
                    type="button"
                  >
                    <span aria-hidden="true" className="nav-icon" />
                    <span className="nav-copy">
                      <strong>{child.label}</strong>
                      <span>{child.meta}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}

function RightDetailPanel({ title, subtitle, children }) {
  return (
    <aside className="app-detail">
      <div className="detail-panel">
        <div className="detail-stack">
          <span className="eyebrow">Context</span>
          <h2 className="detail-title">{title}</h2>
          <p>{subtitle}</p>
        </div>
        {children}
      </div>
    </aside>
  )
}

function AppShell({ brand, navItems, activeKey, onNavSelect, topBar, rightPanel, children }) {
  return (
    <div className="preview-shell">
      <div className="app-shell">
        <aside className="app-sidebar">
          <div className="brand-lockup">
            <span className="brand-kicker">AR Billing Tracker</span>
            <h1 className="brand-title">{brand.title}</h1>
            <span className="page-copy">{brand.copy}</span>
          </div>
          <LeftSidebarNav activeKey={activeKey} items={navItems} onSelect={onNavSelect} />
        </aside>
        <main className="app-main">
          {topBar}
          {children}
        </main>
        <RightDetailPanel title={rightPanel.title} subtitle={rightPanel.subtitle}>
          {rightPanel.content}
        </RightDetailPanel>
      </div>
    </div>
  )
}

export default AppShell