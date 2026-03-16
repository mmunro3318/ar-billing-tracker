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
import reviewSampleData from './data/reviewSampleData.json'
import pageCopy from './data/pageCopy.json'
import { normalizeReviewSampleData } from '../utils/sampleDataContracts'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'

const normalizedReviewData = normalizeReviewSampleData(reviewSampleData)
const reviewCopy = normalizePageCopy('review', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)
const fallbackStatus = { label: 'Unknown', tone: 'muted' }

function cloneRows(rows) {
  return rows.map((row) => ({
    ...row,
    status: { ...(row.status ?? fallbackStatus) },
  }))
}

function ReviewInboxPage({ shell }) {
  const [queueRows, setQueueRows] = useState(() => cloneRows(normalizedReviewData.reviewRows))
  const [selectedIds, setSelectedIds] = useState(() => [normalizedReviewData.reviewRows[0]?.id].filter(Boolean))

  const pendingCount = useMemo(
    () => queueRows.filter((row) => !['Approved', 'Denied'].includes(row.status?.label ?? fallbackStatus.label)).length,
    [queueRows],
  )

  const selectedRow = useMemo(
    () => queueRows.find((row) => selectedIds.includes(row.id)) ?? queueRows[0],
    [queueRows, selectedIds],
  )

  const selectedDiffs = normalizedReviewData.diffById[selectedRow?.id] ?? []

  const setSelection = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) {
        return [...prev, id]
      }

      return prev.filter((value) => value !== id)
    })
  }

  const updateSelectedStatus = (label, tone) => {
    if (!selectedIds.length) {
      return
    }

    setQueueRows((prev) => prev.map((row) => (
      selectedIds.includes(row.id)
        ? { ...row, status: { label, tone } }
        : row
    )))
  }

  const columns = [
    {
      key: 'selected',
      label: '',
      render: (row) => (
        <input
          aria-label={`Select ${row.id}`}
          checked={selectedIds.includes(row.id)}
          onChange={(event) => setSelection(row.id, event.target.checked)}
          onClick={(event) => event.stopPropagation()}
          type="checkbox"
        />
      ),
    },
    { key: 'type', label: 'Type' },
    { key: 'subject', label: 'Subject' },
    { key: 'user', label: 'Submitted By' },
    { key: 'submittedAt', label: 'Submitted At' },
    { key: 'change', label: 'Diff Preview' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const status = row?.status ?? fallbackStatus
        return <Badge tone={status.tone}>{status.label}</Badge>
      },
    },
  ]

  const detailItems = selectedRow
    ? [
      { label: 'Review ID', value: selectedRow.id },
      { label: 'Type', value: selectedRow.type },
      { label: 'Submitted by', value: selectedRow.user },
      { label: 'Status', value: selectedRow.status?.label ?? fallbackStatus.label },
    ]
    : []

  const detailPanel = {
    title: reviewCopy.detailPanel.title,
    subtitle: reviewCopy.detailPanel.subtitle,
    content: (
      <>
        <Surface
          compact
          glass
          title={reviewCopy.detailPanel.summaryTitle}
          eyebrow={selectedRow?.id ?? reviewCopy.detailPanel.summaryEyebrow}
        >
          <DetailList items={detailItems} />
        </Surface>
        <Surface title={reviewCopy.detailPanel.diffTitle} eyebrow="Audit compare">
          {selectedDiffs.map((diff) => (
            <AuditDiffRow key={diff.id} {...diff} />
          ))}
        </Surface>
        <Timeline
          description={reviewCopy.detailPanel.timelineDescription}
          items={normalizedReviewData.timelineItems}
          title={reviewCopy.detailPanel.timelineTitle}
        />
      </>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{
        title: shellBrandTitle,
        copy: reviewCopy.brandCopy,
      }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{reviewCopy.topBar.eyebrow}</span>
            <h2 className="page-title">{reviewCopy.topBar.title}</h2>
            <p className="page-copy">{reviewCopy.topBar.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{reviewCopy.topBar.badge}</span>
            <Button size="sm" variant="secondary">{reviewCopy.topBar.actions.export}</Button>
            <Button leadingDot size="sm">{reviewCopy.topBar.actions.refresh}</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer
          description={reviewCopy.sections.queue.description}
          eyebrow={reviewCopy.sections.queue.eyebrow}
          title={`${reviewCopy.sections.queue.title} (${pendingCount})`}
        >
          <DataTable
            actions={
              <div className="toolbar-group">
                <Button
                  leadingDot
                  size="sm"
                  onClick={() => updateSelectedStatus('Approved', 'success')}
                >
                  {reviewCopy.sections.queue.actions.approve}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => updateSelectedStatus('Denied', 'danger')}
                >
                  {reviewCopy.sections.queue.actions.deny}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setQueueRows(cloneRows(normalizedReviewData.reviewRows))
                    setSelectedIds([normalizedReviewData.reviewRows[0]?.id].filter(Boolean))
                  }}
                >
                  {reviewCopy.sections.queue.actions.reset}
                </Button>
              </div>
            }
            columns={columns}
            description={reviewCopy.sections.queue.tableDescription}
            onRowClick={(rowId) => setSelectedIds([rowId])}
            rowSelectionEnabled
            rows={queueRows}
            selectedRowId={selectedRow?.id}
            title={reviewCopy.sections.queue.tableTitle}
          />
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default ReviewInboxPage