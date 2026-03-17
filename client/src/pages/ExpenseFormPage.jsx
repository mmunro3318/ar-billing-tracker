import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import FormSection from '../components/composition/FormSection'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import { SelectField, TextAreaField, TextInput } from '../components/primitives/Fields'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { fetchJson } from '../utils/apiClient'

const shellBrandTitle = getShellBrandTitle(pageCopy)
const fallbackPage = normalizePageCopy('expenses', pageCopy)

function ExpenseFormPage({ shell }) {
  const [tagOptions, setTagOptions] = useState([])
  const [showCreateTagModal, setShowCreateTagModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    expenseCode: '',
    vendorName: '',
    expenseDate: '',
    amount: '',
    categoryCode: '',
    notes: '',
  })

  useEffect(() => {
    let isActive = true

    async function loadTags() {
      try {
        const payload = await fetchJson('/api/expense-tags')
        if (!isActive) {
          return
        }

        const tags = Array.isArray(payload?.tags) ? payload.tags : []
        setTagOptions(tags)
        if (!formData.categoryCode && tags[0]?.value) {
          setFormData((prev) => ({ ...prev, categoryCode: tags[0].value }))
        }
      } catch {
        if (isActive) {
          setFeedbackMessage('Unable to load expense tags.')
        }
      }
    }

    loadTags()

    return () => {
      isActive = false
    }
  }, [formData.categoryCode])

  const selectOptions = useMemo(
    () => ([...tagOptions, { label: '+ Create new tag', value: '__create_new__' }]),
    [tagOptions],
  )

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const createTag = async () => {
    if (!newTagName.trim()) {
      return
    }

    try {
      const response = await fetch('/api/expense-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName }),
      })

      if (!response.ok) {
        throw new Error('Tag creation failed')
      }

      const body = await response.json()
      const createdTag = body?.tag
      if (!createdTag?.value) {
        return
      }

      setTagOptions((prev) => {
        const deduped = prev.filter((item) => item.value !== createdTag.value)
        return [...deduped, createdTag].sort((a, b) => a.label.localeCompare(b.label))
      })
      setFormData((prev) => ({ ...prev, categoryCode: createdTag.value }))
      setShowCreateTagModal(false)
      setNewTagName('')
      setFeedbackMessage(`Tag ${createdTag.label} is ready to use.`)
    } catch {
      setFeedbackMessage('Could not create tag.')
    }
  }

  const saveExpense = async () => {
    setIsSaving(true)
    setFeedbackMessage('')

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Expense save failed')
      }

      setFormData((prev) => ({
        ...prev,
        expenseCode: '',
        vendorName: '',
        expenseDate: '',
        amount: '',
        notes: '',
      }))
      setFeedbackMessage('Expense draft saved.')
    } catch {
      setFeedbackMessage('Could not save expense draft. Please verify required fields.')
    } finally {
      setIsSaving(false)
    }
  }

  const activeTagLabel = tagOptions.find((item) => item.value === formData.categoryCode)?.label || 'Unassigned'

  const detailPanel = {
    title: 'Expense Draft',
    subtitle: 'Current entry',
    content: (
      <Surface compact glass title='Expense summary' eyebrow='Draft'>
        <DetailList
          items={[
            { label: 'Vendor', value: formData.vendorName || 'Pending' },
            { label: 'Tag', value: activeTagLabel },
            { label: 'Amount', value: formData.amount || '$0' },
            { label: 'Date', value: formData.expenseDate || 'Pending' },
          ]}
        />
      </Surface>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{ title: shellBrandTitle, copy: fallbackPage.brandCopy }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className='page-header'>
          <div className='hero-copy'>
            <span className='eyebrow'>Forms</span>
            <h2 className='page-title'>Expense Form</h2>
            <p className='page-copy'>Capture expenses with tags to support category reporting.</p>
          </div>
          <div className='page-actions'>
            <span className='page-badge'>{isSaving ? 'Saving...' : 'Ready'}</span>
            <Button size='sm' variant='ghost' onClick={() => setShowCreateTagModal(true)}>Create tag</Button>
            <Button size='sm' leadingDot onClick={saveExpense} disabled={isSaving}>Save expense</Button>
          </div>
        </header>
      }
    >
      <div className='page-stack'>
        {feedbackMessage ? <p className='page-copy'>{feedbackMessage}</p> : null}

        <SectionContainer eyebrow='Expense' title='Expense details'>
          <FormSection glass title='Entry'>
            <TextInput label='Expense code' value={formData.expenseCode} onChange={(event) => setField('expenseCode', event.target.value)} />
            <TextInput label='Vendor name' value={formData.vendorName} onChange={(event) => setField('vendorName', event.target.value)} />
            <TextInput label='Expense date' type='date' value={formData.expenseDate} onChange={(event) => setField('expenseDate', event.target.value)} />
            <TextInput label='Amount' value={formData.amount} onChange={(event) => setField('amount', event.target.value)} />
            <div className='form-inline-row'>
              <SelectField
                label='Tag'
                options={selectOptions.length ? selectOptions : [{ label: 'No tags available', value: '' }]}
                value={formData.categoryCode}
                onChange={(event) => {
                  if (event.target.value === '__create_new__') {
                    setShowCreateTagModal(true)
                    return
                  }

                  setField('categoryCode', event.target.value)
                }}
              />
              <Button size='sm' variant='ghost' onClick={() => setShowCreateTagModal(true)}>New tag</Button>
            </div>
            <TextAreaField label='Notes' value={formData.notes} onChange={(event) => setField('notes', event.target.value)} />
          </FormSection>
        </SectionContainer>
      </div>

      {showCreateTagModal ? (
        <div className='modal-overlay' role='presentation' onClick={() => setShowCreateTagModal(false)}>
          <div
            className='modal-card'
            onClick={(event) => event.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-label='Create new expense tag'
          >
            <div className='surface-copy'>
              <span className='surface-eyebrow'>Tags</span>
              <h3 className='surface-title'>Create new tag</h3>
              <p>Add a new expense tag for tracking and reports.</p>
            </div>
            <div className='form-grid'>
              <TextInput label='Tag name' value={newTagName} onChange={(event) => setNewTagName(event.target.value)} />
            </div>
            <div className='toolbar-group'>
              <Button size='sm' variant='ghost' onClick={() => setShowCreateTagModal(false)}>Cancel</Button>
              <Button size='sm' onClick={createTag}>Create tag</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

export default ExpenseFormPage
