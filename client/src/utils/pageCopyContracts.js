function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function deepMergeWithDefaults(value, defaults) {
  if (Array.isArray(defaults)) {
    return Array.isArray(value) ? value : defaults
  }

  if (!isObject(defaults)) {
    return value == null ? defaults : value
  }

  const source = isObject(value) ? value : {}
  const merged = { ...source }

  Object.keys(defaults).forEach((key) => {
    merged[key] = deepMergeWithDefaults(source[key], defaults[key])
  })

  return merged
}

const PAGE_COPY_DEFAULTS = {
  dashboard: {
    brandCopy: '',
    topBar: { eyebrow: 'Dashboard', title: 'Dashboard', description: '', badge: '', actions: [] },
    hero: { title: 'Overview', eyebrow: 'Overview', description: '', actions: [] },
    heroMetrics: { title: 'Metrics', eyebrow: 'At a glance' },
    metricsSection: { title: 'Metrics', eyebrow: 'Metrics', description: '' },
    timeline: { title: 'Timeline', description: '' },
    detailPanel: {
      title: 'Details',
      subtitle: '',
      summaryTitle: 'Summary',
      summaryEyebrow: 'Item',
      timelineTitle: 'History',
      timelineDescription: '',
      summaryItems: [],
    },
    nextActions: { title: 'Next actions', eyebrow: 'Actions', items: [] },
  },
  aging: {
    brandCopy: '',
    topBar: { eyebrow: 'AR Aging', title: 'AR Aging', description: '', badge: '', actions: [] },
    sections: {
      buckets: { title: 'Buckets', eyebrow: 'Summary', description: '' },
      ledger: {
        title: 'Ledger',
        eyebrow: 'Invoices',
        description: '',
        tableTitle: 'Invoices',
        tableDescription: '',
        tableActions: [],
      },
    },
    detailPanel: {
      title: 'Invoice detail',
      subtitle: '',
      summaryTitle: 'Selected invoice',
      summaryEyebrow: 'INV',
      timelineTitle: 'Invoice activity',
      timelineDescription: '',
      summaryItems: [],
    },
  },
  clients: {
    brandCopy: '',
    topBar: { eyebrow: 'Client List', title: 'Client List', description: '', badge: '', actions: [] },
    metricsSection: { title: 'Client metrics', eyebrow: 'Overview', description: '' },
    sections: {
      clientTable: {
        eyebrow: 'Accounts',
        title: 'Clients',
        description: '',
        tableTitle: 'Client ledger',
        tableDescription: '',
        tableActions: [],
      },
      paymentHistory: {
        eyebrow: 'Activity',
        title: 'Payment history',
        description: '',
        timelineTitle: 'Timeline',
        timelineDescription: '',
      },
    },
    detailPanel: {
      title: 'Client context',
      subtitle: '',
      summaryTitle: 'Selected client',
      summaryEyebrow: 'Client',
      timelineTitle: 'Client activity',
      timelineDescription: '',
    },
  },
  review: {
    brandCopy: '',
    topBar: {
      eyebrow: 'Review Inbox',
      title: 'Review Inbox',
      description: '',
      badge: '',
      actions: { export: 'Export', refresh: 'Refresh' },
    },
    sections: {
      queue: {
        eyebrow: 'Queue',
        title: 'Pending changes',
        description: '',
        tableTitle: 'Pending changes',
        tableDescription: '',
        actions: { approve: 'Approve', deny: 'Deny', reset: 'Reset' },
      },
    },
    detailPanel: {
      title: 'Review context',
      subtitle: '',
      summaryTitle: 'Selected item',
      summaryEyebrow: 'Review',
      diffTitle: 'Differences',
      timelineTitle: 'Review activity',
      timelineDescription: '',
    },
  },
  audit: {
    brandCopy: '',
    topBar: {
      eyebrow: 'Audit Log',
      title: 'Audit Log',
      description: '',
      badge: '',
      actions: { filter: 'Filter', export: 'Export' },
    },
    sections: {
      timeline: {
        eyebrow: 'Events',
        title: 'Event timeline',
        description: '',
        timelineTitle: 'Audit activity',
        timelineDescription: '',
      },
      ledger: {
        eyebrow: 'Index',
        title: 'Event index',
        description: '',
        tableTitle: 'Audit events',
        tableDescription: '',
      },
    },
    detailPanel: {
      title: 'Event details',
      subtitle: '',
      summaryTitle: 'Event summary',
      summaryEyebrow: 'Audit',
      changesTitle: 'Field changes',
    },
  },
  expenses: {
    brandCopy: '',
    topBar: { eyebrow: 'Expenses', title: 'Expenses', description: '', badge: '', actions: [] },
    sections: {
      categories: { title: 'Categories', eyebrow: 'Breakdown', description: '' },
      ledger: {
        title: 'Expense transactions',
        eyebrow: 'Ledger',
        description: '',
        tableTitle: 'Expenses',
        tableDescription: '',
        tableActions: [],
      },
    },
    detailPanel: {
      title: 'Expense details',
      subtitle: '',
      summaryTitle: 'Selected expense',
      summaryEyebrow: 'Expense',
      timelineTitle: 'Expense activity',
      timelineDescription: '',
    },
  },
  newClientForm: {
    brandCopy: '',
    topBar: { eyebrow: 'Forms', title: 'New Client', description: '' },
    sections: {
      basic: { eyebrow: 'Client', title: 'Basic', formTitle: 'Client info' },
      billing: { eyebrow: 'Billing', title: 'Billing', formTitle: 'Billing info' },
    },
    detailPanel: {
      title: 'Client draft',
      subtitle: '',
      summaryTitle: 'Summary',
      summaryEyebrow: 'Draft',
    },
  },
  invoiceForm: {
    brandCopy: '',
    topBar: { eyebrow: 'Forms', title: 'Invoice', description: '' },
    sections: {
      invoice: { eyebrow: 'Invoice', title: 'Details', formTitle: 'Invoice details' },
      amounts: { eyebrow: 'Amounts', title: 'Amounts', formTitle: 'Amounts and notes' },
    },
    detailPanel: {
      title: 'Invoice draft',
      subtitle: '',
      summaryTitle: 'Summary',
      summaryEyebrow: 'Draft',
    },
  },
  agingSummaryReport: {
    brandCopy: '',
    topBar: { eyebrow: 'Reports', title: 'Aging Summary', description: '' },
    sections: {
      summary: { eyebrow: 'Summary', title: 'Aging totals' },
      report: { eyebrow: 'Report', title: 'Invoice report', tableTitle: 'Aging rows', tableDescription: '' },
    },
    detailPanel: {
      title: 'Selected row',
      subtitle: '',
      summaryTitle: 'Invoice',
      summaryEyebrow: 'Row',
    },
  },
  cashFlowReport: {
    brandCopy: '',
    topBar: { eyebrow: 'Reports', title: 'Cash Flow', description: '' },
    sections: {
      metrics: { eyebrow: 'Summary', title: 'Cash metrics' },
      transactions: { eyebrow: 'Report', title: 'Transactions', tableTitle: 'Cashflow rows', tableDescription: '' },
    },
    detailPanel: {
      title: 'Selected row',
      subtitle: '',
      summaryTitle: 'Transaction',
      summaryEyebrow: 'Row',
      timelineTitle: 'Recent activity',
      timelineDescription: '',
    },
  },
  placeholders: {
    brandCopy: '',
    topBar: { badge: 'Placeholder', backToDashboard: 'Back to Dashboard' },
    section: { title: 'Screen in progress', eyebrow: 'Scaffold', description: '' },
    emptyState: { eyebrow: 'Coming next', description: '' },
    routes: {
      clients: { eyebrow: 'Clients', title: 'Clients', description: '', message: '' },
      expenses: { eyebrow: 'Expenses', title: 'Expenses', description: '', message: '' },
      review: { eyebrow: 'Review', title: 'Review', description: '', message: '' },
      audit: { eyebrow: 'Audit', title: 'Audit', description: '', message: '' },
      'forms-new-client': { eyebrow: 'Forms', title: 'New Client', description: '', message: '' },
      'forms-invoices': { eyebrow: 'Forms', title: 'Invoices', description: '', message: '' },
      'reports-aging-summary': { eyebrow: 'Reports', title: 'Aging Summary', description: '', message: '' },
      'reports-cash-flow': { eyebrow: 'Reports', title: 'Cash Flow', description: '', message: '' },
    },
    detailPanel: { title: 'Planned implementation', subtitle: '', eyebrow: 'Next up', items: [] },
  },
}

export function normalizePageCopy(pageName, rawCopy) {
  const defaults = PAGE_COPY_DEFAULTS[pageName]
  if (!defaults) {
    return {}
  }

  const source = isObject(rawCopy) ? rawCopy[pageName] : null
  return deepMergeWithDefaults(source, defaults)
}

export function getShellBrandTitle(rawCopy) {
  if (!isObject(rawCopy)) {
    return 'AR Billing Tracker'
  }

  return typeof rawCopy.shell?.brandTitle === 'string'
    ? rawCopy.shell.brandTitle
    : 'AR Billing Tracker'
}
