function LeftSidebarNav({ items, activeKey, onSelect }) {
  return (
    <nav className="sidebar-nav" aria-label="Primary">
      {items.map((item) => (
        <button
          key={item.key}
          className={`nav-item ${item.key === activeKey ? 'is-active' : ''}`.trim()}
          onClick={() => onSelect?.(item)}
          type="button"
        >
          <span aria-hidden="true" className="nav-icon" />
          <span className="nav-copy">
            <strong>{item.label}</strong>
            <span>{item.meta}</span>
          </span>
        </button>
      ))}
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
            <span className="brand-kicker">Preview System</span>
            <h1 className="brand-title">{brand.title}</h1>
            <span className="page-copy">{brand.copy}</span>
          </div>
          <LeftSidebarNav activeKey={activeKey} items={navItems} onSelect={onNavSelect} />
          <div className="sidebar-footnote">
            <span className="eyebrow">Aesthetic</span>
            <p>Neumorphic-dark panels, low-contrast palette, glass overlays, and measured accent blue states.</p>
          </div>
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