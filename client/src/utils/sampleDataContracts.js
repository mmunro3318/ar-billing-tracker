const VALID_TONES = new Set(['accent', 'success', 'warning', 'danger', 'muted'])
const FALLBACK_STATUS = { label: 'Unknown', tone: 'muted' }

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asTone(value, fallback = 'muted') {
  return VALID_TONES.has(value) ? value : fallback
}

function asId(value, fallback) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return fallback
}

function asStatus(value) {
  const status = asObject(value)
  return {
    label: asString(status.label, FALLBACK_STATUS.label),
    tone: asTone(status.tone, FALLBACK_STATUS.tone),
  }
}

function normalizeMetric(item, index) {
  const metric = asObject(item)
  return {
    id: asId(metric.id, `metric-${index + 1}`),
    label: asString(metric.label, `Metric ${index + 1}`),
    value: asString(metric.value, '0'),
  }
}

function normalizeTrend(value) {
  const trend = asObject(value)
  return {
    label: asString(trend.label, 'No change'),
    context: asString(trend.context, ''),
  }
}

function normalizeTimelineItem(item, index) {
  const event = asObject(item)
  return {
    id: asId(event.id, `timeline-${index + 1}`),
    title: asString(event.title, `Event ${index + 1}`),
    detail: asString(event.detail, ''),
    meta: asString(event.meta, ''),
    tone: asTone(event.tone, 'accent'),
  }
}

function normalizeStatCard(item, index) {
  const card = asObject(item)
  return {
    title: asString(card.title, `Card ${index + 1}`),
    value: asString(card.value, '0'),
    trend: normalizeTrend(card.trend),
    tone: asTone(card.tone, 'accent'),
  }
}

function normalizeAgingBucket(item, index) {
  const bucket = asObject(item)
  return {
    label: asString(bucket.label, `Bucket ${index + 1}`),
    value: asString(bucket.value, '$0'),
    count: Number.isFinite(bucket.count) ? bucket.count : 0,
    share: asString(bucket.share, '0%'),
    tone: asTone(bucket.tone, 'muted'),
  }
}

function normalizeInvoiceRow(item, index) {
  const row = asObject(item)
  return {
    id: asId(row.id, `INV-MISSING-${index + 1}`),
    client: asString(row.client, 'Unknown client'),
    bucket: asString(row.bucket, asString(row.status?.label, 'Unknown')),
    serviceDate: asString(row.serviceDate, 'Unknown date'),
    company: asString(row.company, 'Unknown company'),
    billedAmount: asString(row.billedAmount, '$0.00'),
    receivedAmount: asString(row.receivedAmount, '$0.00'),
    status: asStatus(row.status),
  }
}

function normalizeReviewRow(item, index) {
  const row = asObject(item)
  return {
    id: asId(row.id, `REV-MISSING-${index + 1}`),
    type: asString(row.type, 'Unknown type'),
    subject: asString(row.subject, 'Unknown subject'),
    user: asString(row.user, 'Unknown user'),
    submittedAt: asString(row.submittedAt, 'Unknown time'),
    change: asString(row.change, 'No diff available'),
    denialNote: asString(row.denialNote, ''),
    reviewedAt: asString(row.reviewedAt, ''),
    status: asStatus(row.status),
  }
}

function normalizeClientRow(item, index) {
  const row = asObject(item)
  return {
    id: asId(row.id, `CLI-MISSING-${index + 1}`),
    name: asString(row.name, 'Unknown client'),
    contact: asString(row.contact, 'Unknown contact'),
    status: asStatus(row.status),
    totalOutstanding: asString(row.totalOutstanding, '$0.00'),
    daysPastDue: asString(row.daysPastDue, '0'),
    lastPaymentDate: asString(row.lastPaymentDate, 'Unknown date'),
    paymentHistory: asString(row.paymentHistory, 'No history'),
  }
}

function normalizeExpenseRow(item, index) {
  const row = asObject(item)
  return {
    id: asId(row.id, `EXP-MISSING-${index + 1}`),
    vendor: asString(row.vendor, 'Unknown vendor'),
    date: asString(row.date, 'Unknown date'),
    category: asString(row.category, 'Uncategorized'),
    amount: asString(row.amount, '$0.00'),
    status: asStatus(row.status),
  }
}

function normalizeAuditEvent(item, index) {
  const event = asObject(item)
  return {
    id: asId(event.id, `AE-MISSING-${index + 1}`),
    title: asString(event.title, `Audit event ${index + 1}`),
    detail: asString(event.detail, ''),
    meta: asString(event.meta, ''),
    tone: asTone(event.tone, 'accent'),
    eventType: asString(event.eventType, 'Unknown'),
    actor: asString(event.actor, 'Unknown'),
    record: asString(event.record, 'Unknown record'),
  }
}

function normalizeDiffRow(item, index, prefix) {
  const row = asObject(item)
  return {
    id: asId(row.id, `${prefix}-${index + 1}`),
    label: asString(row.label, 'Change'),
    before: asString(row.before, 'N/A'),
    after: asString(row.after, 'N/A'),
    actor: asString(row.actor, 'Unknown'),
    timestamp: asString(row.timestamp, ''),
  }
}

function normalizeDiffLookup(rawLookup, prefix) {
  const lookup = asObject(rawLookup)
  const normalized = {}

  Object.keys(lookup).forEach((lookupKey) => {
    normalized[lookupKey] = asArray(lookup[lookupKey]).map((item, index) => (
      normalizeDiffRow(item, index, `${prefix}-${lookupKey}`)
    ))
  })

  return normalized
}

export function normalizeDashboardSampleData(rawData) {
  const data = asObject(rawData)
  return {
    agingBuckets: asArray(data.agingBuckets).map(normalizeAgingBucket),
    heroMetrics: asArray(data.heroMetrics).map(normalizeMetric),
    statCards: asArray(data.statCards).map(normalizeStatCard),
    timelineItems: asArray(data.timelineItems).map(normalizeTimelineItem),
  }
}

export function normalizeAgingSampleData(rawData) {
  const data = asObject(rawData)
  return {
    agingBuckets: asArray(data.agingBuckets).map(normalizeAgingBucket),
    invoiceRows: asArray(data.invoiceRows).map(normalizeInvoiceRow),
    timelineItems: asArray(data.timelineItems).map(normalizeTimelineItem),
  }
}

export function normalizeClientsSampleData(rawData) {
  const data = asObject(rawData)
  return {
    clientMetrics: asArray(data.clientMetrics).map(normalizeMetric),
    clientRows: asArray(data.clientRows).map(normalizeClientRow),
    timelineItems: asArray(data.timelineItems).map(normalizeTimelineItem),
  }
}

export function normalizeExpensesSampleData(rawData) {
  const data = asObject(rawData)
  return {
    expenseMetrics: asArray(data.expenseMetrics).map(normalizeMetric),
    categoryCards: asArray(data.categoryCards).map(normalizeStatCard),
    expenseRows: asArray(data.expenseRows).map(normalizeExpenseRow),
    timelineItems: asArray(data.timelineItems).map(normalizeTimelineItem),
  }
}

export function normalizeReviewSampleData(rawData) {
  const data = asObject(rawData)
  return {
    reviewRows: asArray(data.reviewRows).map(normalizeReviewRow),
    diffById: normalizeDiffLookup(data.diffById, 'review-diff'),
    timelineItems: asArray(data.timelineItems).map(normalizeTimelineItem),
  }
}

export function normalizeAuditSampleData(rawData) {
  const data = asObject(rawData)
  return {
    auditEvents: asArray(data.auditEvents).map(normalizeAuditEvent),
    diffByEventId: normalizeDiffLookup(data.diffByEventId, 'audit-diff'),
  }
}

export function normalizePreviewSampleData(rawData) {
  const data = asObject(rawData)
  return {
    agingBuckets: asArray(data.agingBuckets).map(normalizeAgingBucket),
    invoiceRows: asArray(data.invoiceRows).map(normalizeInvoiceRow),
    reviewRows: asArray(data.reviewRows).map(normalizeReviewRow),
    statCards: asArray(data.statCards).map(normalizeStatCard),
    timelineItems: asArray(data.timelineItems).map(normalizeTimelineItem),
  }
}

function normalizeOption(item, index) {
  const option = asObject(item)
  return {
    label: asString(option.label, `Option ${index + 1}`),
    value: asString(option.value, `option-${index + 1}`),
  }
}

export function normalizeNewClientSampleData(rawData) {
  const data = asObject(rawData)
  return {
    formDefaults: asObject(data.formDefaults),
    companyOptions: asArray(data.companyOptions).map(normalizeOption),
    billingCycleOptions: asArray(data.billingCycleOptions).map(normalizeOption),
    paymentTermOptions: asArray(data.paymentTermOptions).map(normalizeOption),
  }
}

export function normalizeInvoiceFormSampleData(rawData) {
  const data = asObject(rawData)
  return {
    formDefaults: asObject(data.formDefaults),
    clientOptions: asArray(data.clientOptions).map(normalizeOption),
    statusOptions: asArray(data.statusOptions).map(normalizeOption),
  }
}

export function normalizeAgingSummaryReportData(rawData) {
  const data = asObject(rawData)
  return {
    filters: asObject(data.filters),
    bucketOptions: asArray(data.bucketOptions).map(normalizeOption),
    statusOptions: asArray(data.statusOptions).map(normalizeOption),
    summaryMetrics: asArray(data.summaryMetrics).map(normalizeMetric),
  }
}

export function normalizeCashFlowReportData(rawData) {
  const data = asObject(rawData)
  return {
    filters: asObject(data.filters),
    periodOptions: asArray(data.periodOptions).map(normalizeOption),
    categoryOptions: asArray(data.categoryOptions).map(normalizeOption),
    flowMetrics: asArray(data.flowMetrics).map(normalizeStatCard),
    transactionRows: asArray(data.transactionRows).map((item, index) => {
      const row = asObject(item)
      return {
        id: asId(row.id, `CF-${index + 1}`),
        date: asString(row.date, 'Unknown date'),
        period: asString(row.period, 'month'),
        category: asString(row.category, 'all'),
        description: asString(row.description, 'No description'),
        inflow: asString(row.inflow, '$0'),
        outflow: asString(row.outflow, '$0'),
        net: asString(row.net, '$0'),
        status: asStatus(row.status),
      }
    }),
    timelineItems: asArray(data.timelineItems).map(normalizeTimelineItem),
  }
}

function normalizeBucketName(value) {
  return String(value)
    .toLowerCase()
    .replace('120+', '120 plus')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function filterInvoicesByBucket(invoiceRows, bucketName) {
  const key = normalizeBucketName(bucketName)

  return asArray(invoiceRows).filter((row) => {
    const bucket = normalizeBucketName(row?.bucket)
    const status = normalizeBucketName(row?.status?.label)

    if (key === 'current') {
      return bucket === 'current' || status === 'paid'
    }

    if (key === '30 days') {
      return bucket === '30 days'
    }

    if (key === '60 days') {
      return bucket === '60 days'
    }

    if (key === '90 days') {
      return bucket === '90 days' || status === 'overdue'
    }

    if (key === '120 plus days') {
      return bucket === '120 plus days' || status === '120 days'
    }

    if (key === 'uncollectible') {
      return bucket === 'uncollectible' || status === 'pending review'
    }

    return bucket === key || status === key
  })
}
