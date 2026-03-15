export const NAV_ITEMS = [
  { key: 'dashboard', path: '/dashboard', label: 'Dashboard', meta: 'Overview and trends' },
  { key: 'aging', path: '/aging', label: 'AR Aging', meta: 'Buckets and drill-downs' },
  { key: 'clients', path: '/clients', label: 'Client List', meta: 'History and balances' },
  { key: 'expenses', path: '/expenses', label: 'Expenses', meta: 'Cash-flow outflow' },
  { key: 'review', path: '/review', label: 'Review Inbox', meta: 'Pending non-admin entries' },
  { key: 'audit', path: '/audit', label: 'Audit Log', meta: 'Before and after changes' },
]

export const DEFAULT_PATH = '/dashboard'

export function getActiveNavKey(pathname) {
  const match = NAV_ITEMS.find((item) => item.path === pathname)
  return match?.key ?? 'dashboard'
}