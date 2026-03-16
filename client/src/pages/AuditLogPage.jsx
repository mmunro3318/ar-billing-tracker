import { useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Badge from '../components/primitives/Badge'
import Surface from '../components/primitives/Surface'
import DataTable from '../components/data-display/DataTable'
import Timeline from '../components/data-display/Timeline'
import AuditDiffRow from '../components/data-display/AuditDiffRow'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import auditSampleData from './data/auditSampleData.json'
import pageCopy from './data/pageCopy.json'
import { normalizeAuditSampleData } from '../utils/sampleDataContracts'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'

const normalizedAuditData = normalizeAuditSampleData(auditSampleData)
const auditCopy = normalizePageCopy('audit', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

function AuditLogPage({ shell }) {
  const [selectedEventId, setSelectedEventId] = useState(normalizedAuditData.auditEvents[0]?.id)

  const selectedEvent = useMemo(
    () => normalizedAuditData.auditEvents.find((event) => event.id === selectedEventId) ?? normalizedAuditData.auditEvents[0],
    [selectedEventId],
  )

  const selectedDiffs = normalizedAuditData.diffByEventId[selectedEvent?.id] ?? []

  const columns = [
    {
      key: 'event',
      label: 'Event',
      render: (row) => (
        <div className="table-primary">
          <strong>{row.title}</strong>
          <span className="table-meta">{row.id}</span>
        </div>
      ),
    },
    { key: 'eventType', label: 'Type' },
    { key: 'actor', label: 'Actor' },
    { key: 'record', label: 'Record', mono: true },
    { key: 'meta', label: 'When' },
    {
      key: 'tone',
      label: 'Status',
      render: (row) => <Badge tone={row.tone}>{row.eventType}</Badge>,
    },
    {
      key: 'inspect',
      label: '',
      render: (row) => (
        <Button
          size="sm"
          variant={selectedEventId === row.id ? 'secondary' : 'ghost'}
          onClick={() => setSelectedEventId(row.id)}
        >
          Inspect
        </Button>
      ),
    },
  ]

  const summaryItems = selectedEvent
    ? [
      { label: 'Event ID', value: selectedEvent.id },
      { label: 'Type', value: selectedEvent.eventType },
      { label: 'Actor', value: selectedEvent.actor },
      { label: 'Record', value: selectedEvent.record },
    ]
    : []

  const detailPanel = {
    title: auditCopy.detailPanel.title,
    subtitle: auditCopy.detailPanel.subtitle,
    content: (
      <>
        <Surface
          compact
          glass
          title={auditCopy.detailPanel.summaryTitle}
          eyebrow={selectedEvent?.id ?? auditCopy.detailPanel.summaryEyebrow}
        >
          <DetailList items={summaryItems} />
        </Surface>
        <Surface title={auditCopy.detailPanel.changesTitle} eyebrow="Before / After">
          {selectedDiffs.map((diff) => (
            <AuditDiffRow key={diff.id} {...diff} />
          ))}
        </Surface>
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: shellBrandTitle,
        copy: auditCopy.brandCopy,
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{auditCopy.topBar.eyebrow}</span>
            <h2 className="page-title">{auditCopy.topBar.title}</h2>
            <p className="page-copy">{auditCopy.topBar.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{auditCopy.topBar.badge}</span>
            <Button size="sm" variant="secondary">{auditCopy.topBar.actions.filter}</Button>
            <Button size="sm" variant="ghost">{auditCopy.topBar.actions.export}</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer
          description={auditCopy.sections.timeline.description}
          eyebrow={auditCopy.sections.timeline.eyebrow}
          title={auditCopy.sections.timeline.title}
        >
          <Timeline
            description={auditCopy.sections.timeline.timelineDescription}
            items={normalizedAuditData.auditEvents}
            title={auditCopy.sections.timeline.timelineTitle}
          />
        </SectionContainer>

        <SectionContainer
          description={auditCopy.sections.ledger.description}
          eyebrow={auditCopy.sections.ledger.eyebrow}
          title={auditCopy.sections.ledger.title}
        >
          <DataTable
            columns={columns}
            description={auditCopy.sections.ledger.tableDescription}
            onRowClick={setSelectedEventId}
            rowSelectionEnabled
            rows={normalizedAuditData.auditEvents}
            selectedRowId={selectedEventId}
            title={auditCopy.sections.ledger.tableTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default AuditLogPage