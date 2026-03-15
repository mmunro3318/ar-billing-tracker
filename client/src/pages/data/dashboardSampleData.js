export const dashboardHeroMetrics = [
  { label: 'Approval SLA', value: '2h 14m' },
  { label: 'Avg days in AR', value: '46.2' },
  { label: 'Claims flagged', value: '11' },
  { label: 'Net inflow', value: '$41,880' },
]

export const dashboardStatCards = [
  {
    title: 'Open receivables',
    value: '$184,220',
    trend: { label: '+8.2%', context: 'vs prior 30-day cycle' },
    tone: 'accent',
  },
  {
    title: 'Collected this month',
    value: '$62,480',
    trend: { label: 'On pace', context: '14 deposits reconciled' },
    tone: 'success',
  },
  {
    title: 'Pending review',
    value: '17',
    trend: { label: 'Admin action', context: '9 invoices and 8 payments' },
    tone: 'warning',
  },
  {
    title: 'Uncollectible watch',
    value: '$8,940',
    trend: { label: 'Escalating', context: '4 items are beyond 120 days' },
    tone: 'danger',
  },
]

export const dashboardAgingBuckets = [
  { label: 'Current', value: '$58,110', count: 24, share: '31%', tone: 'success' },
  { label: '30 Days', value: '$42,380', count: 18, share: '23%', tone: 'accent' },
  { label: '60 Days', value: '$36,920', count: 14, share: '20%', tone: 'accent' },
  { label: '90 Days', value: '$21,870', count: 10, share: '12%', tone: 'warning' },
  { label: '120+ Days', value: '$15,940', count: 6, share: '9%', tone: 'danger' },
  { label: 'Uncollectible', value: '$8,940', count: 4, share: '5%', tone: 'muted' },
]

export const dashboardTimelineItems = [
  {
    id: 1,
    title: 'Partial payment posted',
    detail: 'Received $320.00 against INV-23954 and updated the outstanding balance for J. Lewis.',
    meta: '10:04 AM',
    tone: 'success',
  },
  {
    id: 2,
    title: 'Reminder email sent',
    detail: 'Second reminder issued to BlueCross for INV-24031 with a 7-day follow-up task.',
    meta: '09:12 AM',
    tone: 'accent',
  },
  {
    id: 3,
    title: 'Aging threshold crossed',
    detail: 'R. Tan moved into the 120+ day bucket and is ready for uncollectible review.',
    meta: 'Yesterday',
    tone: 'warning',
  },
  {
    id: 4,
    title: 'Approval denied',
    detail: 'Admin rejected a duplicate payment entry and requested source document confirmation.',
    meta: 'Yesterday',
    tone: 'danger',
  },
]