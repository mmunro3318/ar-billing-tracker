import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  normalizeAgingSampleData,
  normalizeAuditSampleData,
  normalizeClientsSampleData,
  normalizeDashboardSampleData,
  normalizeExpensesSampleData,
  normalizePreviewSampleData,
  normalizeReviewSampleData,
} from '../src/utils/sampleDataContracts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../src/pages/data')
const VALID_TONES = new Set(['accent', 'success', 'warning', 'danger', 'muted'])

function loadJson(fileName) {
  const fullPath = path.join(dataDir, fileName)
  try {
    const content = fs.readFileSync(fullPath, 'utf8')
    return { data: JSON.parse(content), errors: [] }
  } catch (error) {
    return { data: null, errors: [`${fileName}: failed to parse JSON (${error.message})`] }
  }
}

function ensureArray(root, key, fileName) {
  if (!Array.isArray(root?.[key])) {
    return [`${fileName}: expected ${key} to be an array`]
  }
  return []
}

function ensureObject(root, key, fileName) {
  const value = root?.[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [`${fileName}: expected ${key} to be an object`]
  }
  return []
}

function checkRequiredString(item, key, context) {
  return typeof item?.[key] === 'string' && item[key].trim().length
    ? []
    : [`${context}: missing or invalid string field '${key}'`]
}

function checkStatus(item, context) {
  const errors = []
  const status = item?.status
  if (!status || typeof status !== 'object' || Array.isArray(status)) {
    return [`${context}: missing status object`]
  }

  errors.push(...checkRequiredString(status, 'label', `${context}.status`))
  if (!VALID_TONES.has(status.tone)) {
    errors.push(`${context}.status: invalid tone '${status.tone ?? 'undefined'}'`)
  }

  return errors
}

function validateTimelineItems(items, context) {
  const errors = []
  items.forEach((item, index) => {
    const rowContext = `${context}[${index}]`
    errors.push(...checkRequiredString(item, 'title', rowContext))
    errors.push(...checkRequiredString(item, 'detail', rowContext))
    errors.push(...checkRequiredString(item, 'meta', rowContext))
    if (!VALID_TONES.has(item?.tone)) {
      errors.push(`${rowContext}: invalid tone '${item?.tone ?? 'undefined'}'`)
    }
  })
  return errors
}

function validateDiffLookup(lookup, context) {
  const errors = []
  Object.entries(lookup).forEach(([lookupKey, rows]) => {
    if (!Array.isArray(rows)) {
      errors.push(`${context}.${lookupKey}: expected array`)
      return
    }

    rows.forEach((row, index) => {
      const rowContext = `${context}.${lookupKey}[${index}]`
      errors.push(...checkRequiredString(row, 'label', rowContext))
      errors.push(...checkRequiredString(row, 'before', rowContext))
      errors.push(...checkRequiredString(row, 'after', rowContext))
      errors.push(...checkRequiredString(row, 'actor', rowContext))
      errors.push(...checkRequiredString(row, 'timestamp', rowContext))
    })
  })

  return errors
}

function validateDashboard(root, fileName) {
  const errors = [
    ...ensureArray(root, 'heroMetrics', fileName),
    ...ensureArray(root, 'statCards', fileName),
    ...ensureArray(root, 'agingBuckets', fileName),
    ...ensureArray(root, 'timelineItems', fileName),
  ]

  root?.heroMetrics?.forEach((item, index) => {
    errors.push(...checkRequiredString(item, 'label', `${fileName}.heroMetrics[${index}]`))
    errors.push(...checkRequiredString(item, 'value', `${fileName}.heroMetrics[${index}]`))
  })

  root?.statCards?.forEach((item, index) => {
    const context = `${fileName}.statCards[${index}]`
    errors.push(...checkRequiredString(item, 'title', context))
    errors.push(...checkRequiredString(item, 'value', context))
    if (!VALID_TONES.has(item?.tone)) {
      errors.push(`${context}: invalid tone '${item?.tone ?? 'undefined'}'`)
    }
  })

  root?.agingBuckets?.forEach((item, index) => {
    const context = `${fileName}.agingBuckets[${index}]`
    errors.push(...checkRequiredString(item, 'label', context))
    errors.push(...checkRequiredString(item, 'value', context))
    if (!VALID_TONES.has(item?.tone)) {
      errors.push(`${context}: invalid tone '${item?.tone ?? 'undefined'}'`)
    }
  })

  errors.push(...validateTimelineItems(root?.timelineItems ?? [], `${fileName}.timelineItems`))
  normalizeDashboardSampleData(root)
  return errors
}

function validateAging(root, fileName) {
  const errors = [
    ...ensureArray(root, 'agingBuckets', fileName),
    ...ensureArray(root, 'invoiceRows', fileName),
    ...ensureArray(root, 'timelineItems', fileName),
  ]

  root?.invoiceRows?.forEach((row, index) => {
    const context = `${fileName}.invoiceRows[${index}]`
    errors.push(...checkRequiredString(row, 'id', context))
    errors.push(...checkRequiredString(row, 'client', context))
    errors.push(...checkRequiredString(row, 'serviceDate', context))
    errors.push(...checkStatus(row, context))
  })

  errors.push(...validateTimelineItems(root?.timelineItems ?? [], `${fileName}.timelineItems`))
  normalizeAgingSampleData(root)
  return errors
}

function validateClients(root, fileName) {
  const errors = [
    ...ensureArray(root, 'clientMetrics', fileName),
    ...ensureArray(root, 'clientRows', fileName),
    ...ensureArray(root, 'timelineItems', fileName),
  ]

  root?.clientRows?.forEach((row, index) => {
    const context = `${fileName}.clientRows[${index}]`
    errors.push(...checkRequiredString(row, 'id', context))
    errors.push(...checkRequiredString(row, 'name', context))
    errors.push(...checkStatus(row, context))
  })

  errors.push(...validateTimelineItems(root?.timelineItems ?? [], `${fileName}.timelineItems`))
  normalizeClientsSampleData(root)
  return errors
}

function validateExpenses(root, fileName) {
  const errors = [
    ...ensureArray(root, 'expenseMetrics', fileName),
    ...ensureArray(root, 'categoryCards', fileName),
    ...ensureArray(root, 'expenseRows', fileName),
    ...ensureArray(root, 'timelineItems', fileName),
  ]

  root?.expenseRows?.forEach((row, index) => {
    const context = `${fileName}.expenseRows[${index}]`
    errors.push(...checkRequiredString(row, 'id', context))
    errors.push(...checkRequiredString(row, 'vendor', context))
    errors.push(...checkStatus(row, context))
  })

  root?.categoryCards?.forEach((row, index) => {
    const context = `${fileName}.categoryCards[${index}]`
    errors.push(...checkRequiredString(row, 'title', context))
    errors.push(...checkRequiredString(row, 'value', context))
    if (!VALID_TONES.has(row?.tone)) {
      errors.push(`${context}: invalid tone '${row?.tone ?? 'undefined'}'`)
    }
  })

  errors.push(...validateTimelineItems(root?.timelineItems ?? [], `${fileName}.timelineItems`))
  normalizeExpensesSampleData(root)
  return errors
}

function validateReview(root, fileName) {
  const errors = [
    ...ensureArray(root, 'reviewRows', fileName),
    ...ensureObject(root, 'diffById', fileName),
    ...ensureArray(root, 'timelineItems', fileName),
  ]

  root?.reviewRows?.forEach((row, index) => {
    const context = `${fileName}.reviewRows[${index}]`
    errors.push(...checkRequiredString(row, 'id', context))
    errors.push(...checkRequiredString(row, 'type', context))
    errors.push(...checkRequiredString(row, 'subject', context))
    errors.push(...checkStatus(row, context))
  })

  if (root?.diffById) {
    errors.push(...validateDiffLookup(root.diffById, `${fileName}.diffById`))
  }

  errors.push(...validateTimelineItems(root?.timelineItems ?? [], `${fileName}.timelineItems`))
  normalizeReviewSampleData(root)
  return errors
}

function validateAudit(root, fileName) {
  const errors = [
    ...ensureArray(root, 'auditEvents', fileName),
    ...ensureObject(root, 'diffByEventId', fileName),
  ]

  root?.auditEvents?.forEach((row, index) => {
    const context = `${fileName}.auditEvents[${index}]`
    errors.push(...checkRequiredString(row, 'id', context))
    errors.push(...checkRequiredString(row, 'title', context))
    errors.push(...checkRequiredString(row, 'eventType', context))
    errors.push(...checkRequiredString(row, 'actor', context))
    if (!VALID_TONES.has(row?.tone)) {
      errors.push(`${context}: invalid tone '${row?.tone ?? 'undefined'}'`)
    }
  })

  if (root?.diffByEventId) {
    errors.push(...validateDiffLookup(root.diffByEventId, `${fileName}.diffByEventId`))
  }

  normalizeAuditSampleData(root)
  return errors
}

function validatePreview(root, fileName) {
  const errors = [
    ...ensureArray(root, 'agingBuckets', fileName),
    ...ensureArray(root, 'invoiceRows', fileName),
    ...ensureArray(root, 'reviewRows', fileName),
    ...ensureArray(root, 'statCards', fileName),
    ...ensureArray(root, 'timelineItems', fileName),
  ]

  root?.invoiceRows?.forEach((row, index) => {
    const context = `${fileName}.invoiceRows[${index}]`
    errors.push(...checkRequiredString(row, 'id', context))
    errors.push(...checkStatus(row, context))
  })

  root?.reviewRows?.forEach((row, index) => {
    const context = `${fileName}.reviewRows[${index}]`
    errors.push(...checkRequiredString(row, 'id', context))
    errors.push(...checkStatus(row, context))
  })

  errors.push(...validateTimelineItems(root?.timelineItems ?? [], `${fileName}.timelineItems`))
  normalizePreviewSampleData(root)
  return errors
}

const validators = [
  { file: 'dashboardSampleData.json', run: validateDashboard },
  { file: 'agingSampleData.json', run: validateAging },
  { file: 'clientsSampleData.json', run: validateClients },
  { file: 'expensesSampleData.json', run: validateExpenses },
  { file: 'reviewSampleData.json', run: validateReview },
  { file: 'auditSampleData.json', run: validateAudit },
  { file: 'previewSampleData.json', run: validatePreview },
]

const allErrors = []

validators.forEach(({ file, run }) => {
  const { data, errors: parseErrors } = loadJson(file)
  allErrors.push(...parseErrors)
  if (!data) {
    return
  }

  allErrors.push(...run(data, file))
})

if (allErrors.length) {
  console.error('Sample data validation failed:')
  allErrors.forEach((error) => {
    console.error(`- ${error}`)
  })
  process.exit(1)
}

console.log('Sample data validation passed')
console.log(`- Files checked: ${validators.length}`)
