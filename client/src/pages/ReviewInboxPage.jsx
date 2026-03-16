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
const pendingLabels = new Set(['Needs review', 'Ready', 'Queued', 'Pending'])

function isPendingStatus(label) {
  return pendingLabels.has(label)
}

function cloneRows(rows) {
  return rows.map((row) => ({
    ...row,
    status: { ...(row.status ?? fallbackStatus) },
    denialNote: row.denialNote ?? '',
    reviewedAt: row.reviewedAt ?? '',
  }))
}

function ReviewInboxPage({ shell }) {
  const initialRows = useMemo(() => cloneRows(normalizedReviewData.reviewRows), [])
  const [userRole, setUserRole] = useState('admin')
  const [queueRows, setQueueRows] = useState(() => initialRows.filter((row) => isPendingStatus(row.status?.label)))
  const [historyRows, setHistoryRows] = useState(() => initialRows.filter((row) => !isPendingStatus(row.status?.label)))
  const [selectedIds, setSelectedIds] = useState(() => [initialRows[0]?.id].filter(Boolean))
  const [selectedRowId, setSelectedRowId] = useState(initialRows[0]?.id ?? null)
  const [reviewActivity, setReviewActivity] = useState([])
  const [currentUser] = useState('Dana R.')

  const dataEntryRows = useMemo(
    () => [...queueRows, ...historyRows].filter((row) => row.user === currentUser),
    [currentUser, historyRows, queueRows],
  )

  const visibleRows = userRole === 'admin' ? queueRows : dataEntryRows

  const pendingCount = useMemo(() => {
    const source = userRole === 'admin' ? queueRows : dataEntryRows
    return source.filter((row) => isPendingStatus(row.status?.label ?? fallbackStatus.label)).length
  }, [dataEntryRows, queueRows, userRole])

  const selectedRow = useMemo(
    () => visibleRows.find((row) => row.id === selectedRowId) ?? visibleRows[0],
    [selectedRowId, visibleRows],
  )

  const selectedDiffs = normalizedReviewData.diffById[selectedRow?.id] ?? []

  const setSelection = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) {
        const next = prev.includes(id) ? prev : [...prev, id]
        setSelectedRowId(id)
        return next
      }

      return prev.filter((value) => value !== id)
    })
  }

  const addActivity = (title, detail, tone) => {
    setReviewActivity((prev) => [
      {
        id: `ACT-${prev.length + 1}`,
        title,
        detail,
        meta: 'Now',
        tone,
      },
      ...prev,
    ])
  }

  const updateSelectedStatus = (label, tone) => {
    if (userRole !== 'admin' || !selectedIds.length) {
      return
    }

    const selectedSet = new Set(selectedIds)
    const movedRows = queueRows
      .filter((row) => selectedSet.has(row.id))
      .map((row) => ({
        ...row,
        status: { label, tone },
        reviewedAt: 'Now',
        denialNote: label === 'Denied' ? (row.denialNote || 'Needs source attachment before approval.') : row.denialNote,
      }))

    if (!movedRows.length) {
      return
    }

    setQueueRows((prev) => prev.filter((row) => !selectedSet.has(row.id)))
    setHistoryRows((prev) => [...movedRows, ...prev])
    setSelectedIds([])
    setSelectedRowId(movedRows[0]?.id ?? null)
    addActivity(
      `${label}: ${movedRows.length} item${movedRows.length > 1 ? 's' : ''}`,
      `Admin ${label.toLowerCase()} action applied from queue toolbar.`,
      tone,
    )
  }

  const restoreFromHistory = (rowId) => {
    const target = historyRows.find((row) => row.id === rowId)
    if (!target) {
      return
    }

    const restored = {
      ...target,
      status: { label: 'Pending', tone: 'warning' },
      reviewedAt: '',
    }

    setHistoryRows((prev) => prev.filter((row) => row.id !== rowId))
    setQueueRows((prev) => [restored, ...prev])
    setSelectedRowId(restored.id)
    addActivity(`Reversed: ${restored.id}`, 'Admin returned processed item to pending queue.', 'warning')
  }

  const queueColumns = [
    ...(userRole === 'admin'
      ? [{
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
      }]
      : []),
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
    ...(userRole === 'admin'
      ? []
      : [{
        key: 'denialNote',
        label: 'Admin Note',
        render: (row) => row.denialNote || 'No note',
      }]),
  ]

  const historyColumns = [
    { key: 'id', label: 'Review ID' },
    { key: 'subject', label: 'Subject' },
    { key: 'user', label: 'Submitted By' },
    {
      key: 'status',
      label: 'Outcome',
      render: (row) => <Badge tone={row.status?.tone ?? 'muted'}>{row.status?.label ?? 'Unknown'}</Badge>,
    },
    { key: 'reviewedAt', label: 'Reviewed At' },
    {
      key: 'actions',
      label: 'Action',
      render: (row) => (
        <Button onClick={() => restoreFromHistory(row.id)} size="sm" variant="ghost">Return to pending</Button>
      ),
    },
  ]

  const detailItems = selectedRow
    ? [
      { label: 'Review ID', value: selectedRow.id },
      { label: 'Type', value: selectedRow.type },
      { label: 'Submitted by', value: selectedRow.user },
      { label: 'Status', value: selectedRow.status?.label ?? fallbackStatus.label },
      ...(selectedRow.denialNote ? [{ label: 'Denial note', value: selectedRow.denialNote }] : []),
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
          items={reviewActivity.length ? reviewActivity : normalizedReviewData.timelineItems}
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setUserRole((prev) => (prev === 'admin' ? 'data-entry' : 'admin'))
                setSelectedIds([])
              }}
            >
              {userRole === 'admin' ? 'Switch to Data Entry View' : 'Switch to Admin View'}
            </Button>
            <Button size="sm" variant="secondary">{reviewCopy.topBar.actions.export}</Button>
            <Button leadingDot size="sm">{reviewCopy.topBar.actions.refresh}</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer
          description={userRole === 'admin' ? reviewCopy.sections.queue.description : `Showing entries submitted by ${currentUser}.`}
          eyebrow={reviewCopy.sections.queue.eyebrow}
          title={(
            <>
              {reviewCopy.sections.queue.title}{' '}
              <span className="pending-highlight">({pendingCount})</span>
              {userRole === 'admin' ? '' : ' - Data Entry'}
            </>
          )}
        >
          <DataTable
            actions={
              userRole === 'admin'
                ? (
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
                        const baseRows = cloneRows(normalizedReviewData.reviewRows)
                        setQueueRows(baseRows.filter((row) => isPendingStatus(row.status?.label)))
                        setHistoryRows(baseRows.filter((row) => !isPendingStatus(row.status?.label)))
                        setSelectedIds([baseRows[0]?.id].filter(Boolean))
                        setSelectedRowId(baseRows[0]?.id ?? null)
                        setReviewActivity([])
                      }}
                    >
                      {reviewCopy.sections.queue.actions.reset}
                    </Button>
                  </div>
                )
                : null
            }
            columns={queueColumns}
            description={reviewCopy.sections.queue.tableDescription}
            onRowClick={(rowId) => {
              setSelectedRowId(rowId)
              setSelectedIds([rowId])
            }}
            rowSelectionEnabled
            rows={visibleRows}
            selectedRowId={selectedRowId}
            title={reviewCopy.sections.queue.tableTitle}
          />
        </SectionContainer>

        {userRole === 'admin' ? (
          <SectionContainer
            description="Processed entries move here. Use return-to-pending when a correction is needed."
            eyebrow="History"
            title="Review log"
          >
            <DataTable
              columns={historyColumns}
              description="Latest approvals and denials, including reversible actions."
              rows={historyRows}
              title="Processed items"
            />
          </SectionContainer>
        ) : null}
      </div>
    </AppShell>
  )
}

export default ReviewInboxPage