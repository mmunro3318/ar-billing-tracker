import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import FormSection from '../components/composition/FormSection'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import { SelectField, TextAreaField, TextInput } from '../components/primitives/Fields'
import invoiceFormSampleData from './data/invoiceFormSampleData.json'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { normalizeInvoiceFormSampleData } from '../utils/sampleDataContracts'
import { fetchJson } from '../utils/apiClient'

const normalizedData = normalizeInvoiceFormSampleData(invoiceFormSampleData)
const page = normalizePageCopy('invoiceForm', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

function InvoiceFormPage({ shell }) {
  const [formData, setFormData] = useState(normalizedData.formDefaults)
  const [clientOptions, setClientOptions] = useState(normalizedData.clientOptions)
  const [showCreateClientModal, setShowCreateClientModal] = useState(false)
  const [newClientData, setNewClientData] = useState({ name: '', contactName: '' })
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [paymentData, setPaymentData] = useState({
    paymentCode: '',
    paymentDate: '',
    amountReceived: '',
    allocationMethod: 'manual',
    referenceNumber: '',
    notes: '',
  })
  const [expenseData, setExpenseData] = useState({
    expenseCode: '',
    vendorName: '',
    expenseDate: '',
    amount: '',
    notes: '',
  })
  const [savedAt, setSavedAt] = useState('Not saved')

  useEffect(() => {
    let isActive = true

    async function loadClientOptions() {
      try {
        const payload = await fetchJson('/api/clients/options')
        if (!isActive) {
          return
        }

        const options = Array.isArray(payload?.options) && payload.options.length
          ? payload.options
          : normalizedData.clientOptions

        setClientOptions(options)
        if (!options.some((option) => option.value === formData.client)) {
          setFormData((prev) => ({ ...prev, client: options[0]?.value || '' }))
        }
      } catch {
        if (isActive) {
          setClientOptions(normalizedData.clientOptions)
        }
      }
    }

    loadClientOptions()

    return () => {
      isActive = false
    }
  }, [formData.client])

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const setPaymentField = (key, value) => {
    setPaymentData((prev) => ({ ...prev, [key]: value }))
  }

  const setExpenseField = (key, value) => {
    setExpenseData((prev) => ({ ...prev, [key]: value }))
  }

  const createClient = async () => {
    const payload = {
      name: newClientData.name,
      contactName: newClientData.contactName,
    }

    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('Client create failed')
    }

    const body = await response.json()
    const created = body?.client

    if (!created?.id) {
      return
    }

    const nextOption = {
      value: created.id,
      label: `${created.name} / ${created.contactName}`,
    }

    setClientOptions((prev) => {
      const deduped = prev.filter((option) => option.value !== nextOption.value)
      return [...deduped, nextOption].sort((a, b) => a.label.localeCompare(b.label))
    })
    setField('client', nextOption.value)
    setNewClientData({ name: '', contactName: '' })
    setShowCreateClientModal(false)
    setFeedbackMessage(`Client ${created.name} created and selected.`)
  }

  const savePayment = async () => {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    })

    if (!response.ok) {
      throw new Error('Payment save failed')
    }

    setPaymentData({
      paymentCode: '',
      paymentDate: '',
      amountReceived: '',
      allocationMethod: 'manual',
      referenceNumber: '',
      notes: '',
    })
    setFeedbackMessage('Payment draft saved.')
  }

  const saveExpense = async () => {
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    })

    if (!response.ok) {
      throw new Error('Expense save failed')
    }

    setExpenseData({
      expenseCode: '',
      vendorName: '',
      expenseDate: '',
      amount: '',
      notes: '',
    })
    setFeedbackMessage('Expense draft saved.')
  }

  const summaryItems = useMemo(() => ([
    { label: 'Invoice', value: formData.invoiceCode || 'Draft' },
    { label: 'Client', value: formData.client || 'Pending' },
    { label: 'Billed', value: formData.billedAmount || '$0.00' },
    { label: 'Status', value: formData.status || 'Pending' },
  ]), [formData.billedAmount, formData.client, formData.invoiceCode, formData.status])

  const clientSelectOptions = useMemo(
    () => ([...clientOptions, { label: '+ Create new client', value: '__create_new__' }]),
    [clientOptions],
  )

  const detailPanel = {
    title: page.detailPanel.title,
    subtitle: page.detailPanel.subtitle,
    content: (
      <Surface compact glass title={page.detailPanel.summaryTitle} eyebrow={page.detailPanel.summaryEyebrow}>
        <DetailList items={summaryItems} />
      </Surface>
    ),
  }

  return (
    <AppShell
      activeKey={shell.activeKey}
      brand={{ title: shellBrandTitle, copy: page.brandCopy }}
      navItems={shell.navItems}
      onNavSelect={shell.onNavigate}
      rightPanel={detailPanel}
      topBar={
        <header className="page-header">
          <div className="hero-copy">
            <span className="eyebrow">{page.topBar.eyebrow}</span>
            <h2 className="page-title">{page.topBar.title}</h2>
            <p className="page-copy">{page.topBar.description}</p>
          </div>
          <div className="page-actions">
            <span className="page-badge">{savedAt}</span>
            <Button size="sm" variant="secondary" onClick={() => setFormData(normalizedData.formDefaults)}>Clear</Button>
            <Button size="sm" leadingDot onClick={() => setSavedAt('Saved now')}>Save draft</Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        {feedbackMessage ? <p className="page-copy">{feedbackMessage}</p> : null}
        <SectionContainer eyebrow={page.sections.invoice.eyebrow} title={page.sections.invoice.title}>
          <FormSection glass title={page.sections.invoice.formTitle}>
            <TextInput label="Invoice code" value={formData.invoiceCode} onChange={(event) => setField('invoiceCode', event.target.value)} />
            <div className="form-inline-row">
              <SelectField
                label="Client"
                options={clientSelectOptions}
                value={formData.client}
                onChange={(event) => {
                  if (event.target.value === '__create_new__') {
                    setShowCreateClientModal(true)
                    return
                  }

                  setField('client', event.target.value)
                }}
              />
              <Button size="sm" variant="ghost" onClick={() => setShowCreateClientModal(true)}>Create client</Button>
            </div>
            <TextInput label="Service date" type="date" value={formData.serviceDate} onChange={(event) => setField('serviceDate', event.target.value)} />
            <TextInput label="Date billed" type="date" value={formData.dateBilled} onChange={(event) => setField('dateBilled', event.target.value)} />
          </FormSection>
        </SectionContainer>

        <SectionContainer eyebrow={page.sections.amounts.eyebrow} title={page.sections.amounts.title}>
          <FormSection glass title={page.sections.amounts.formTitle}>
            <TextInput label="Billed amount" value={formData.billedAmount} onChange={(event) => setField('billedAmount', event.target.value)} />
            <TextInput label="Received amount" value={formData.receivedAmount} onChange={(event) => setField('receivedAmount', event.target.value)} />
            <SelectField label="Status" options={normalizedData.statusOptions} value={formData.status} onChange={(event) => setField('status', event.target.value)} />
            <TextAreaField label="Notes" value={formData.notes} onChange={(event) => setField('notes', event.target.value)} />
          </FormSection>
        </SectionContainer>

        <SectionContainer eyebrow="Payment" title="Payment form">
          <FormSection glass title="Payment details">
            <TextInput label="Payment code" value={paymentData.paymentCode} onChange={(event) => setPaymentField('paymentCode', event.target.value)} />
            <TextInput label="Payment date" type="date" value={paymentData.paymentDate} onChange={(event) => setPaymentField('paymentDate', event.target.value)} />
            <TextInput label="Amount received" value={paymentData.amountReceived} onChange={(event) => setPaymentField('amountReceived', event.target.value)} />
            <SelectField
              label="Allocation method"
              options={[
                { label: 'Manual', value: 'manual' },
                { label: 'Auto oldest', value: 'auto_oldest' },
                { label: 'Auto full match', value: 'auto_full_match' },
              ]}
              value={paymentData.allocationMethod}
              onChange={(event) => setPaymentField('allocationMethod', event.target.value)}
            />
            <TextInput label="Reference number" value={paymentData.referenceNumber} onChange={(event) => setPaymentField('referenceNumber', event.target.value)} />
            <TextAreaField label="Notes" value={paymentData.notes} onChange={(event) => setPaymentField('notes', event.target.value)} />
            <div className="toolbar-group">
              <Button size="sm" onClick={savePayment}>Save payment draft</Button>
            </div>
          </FormSection>
        </SectionContainer>

        <SectionContainer eyebrow="Expense" title="Expense form">
          <FormSection glass title="Expense details">
            <TextInput label="Expense code" value={expenseData.expenseCode} onChange={(event) => setExpenseField('expenseCode', event.target.value)} />
            <TextInput label="Vendor" value={expenseData.vendorName} onChange={(event) => setExpenseField('vendorName', event.target.value)} />
            <TextInput label="Expense date" type="date" value={expenseData.expenseDate} onChange={(event) => setExpenseField('expenseDate', event.target.value)} />
            <TextInput label="Amount" value={expenseData.amount} onChange={(event) => setExpenseField('amount', event.target.value)} />
            <TextAreaField label="Notes" value={expenseData.notes} onChange={(event) => setExpenseField('notes', event.target.value)} />
            <div className="toolbar-group">
              <Button size="sm" onClick={saveExpense}>Save expense draft</Button>
            </div>
          </FormSection>
        </SectionContainer>
      </div>

      {showCreateClientModal ? (
        <div className="modal-overlay" role="presentation" onClick={() => setShowCreateClientModal(false)}>
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Create new client"
          >
            <div className="surface-copy">
              <span className="surface-eyebrow">Client</span>
              <h3 className="surface-title">Create new client</h3>
              <p>Add a client and immediately use it on this invoice draft.</p>
            </div>
            <div className="form-grid">
              <TextInput label="Client name" value={newClientData.name} onChange={(event) => setNewClientData((prev) => ({ ...prev, name: event.target.value }))} />
              <TextInput label="Contact name" value={newClientData.contactName} onChange={(event) => setNewClientData((prev) => ({ ...prev, contactName: event.target.value }))} />
            </div>
            <div className="toolbar-group">
              <Button size="sm" variant="ghost" onClick={() => setShowCreateClientModal(false)}>Cancel</Button>
              <Button size="sm" onClick={createClient}>Create client</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

export default InvoiceFormPage
