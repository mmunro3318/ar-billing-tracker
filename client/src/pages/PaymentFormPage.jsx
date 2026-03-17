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
const fallbackPage = normalizePageCopy('invoiceForm', pageCopy)

function PaymentFormPage({ shell }) {
  const [clientOptions, setClientOptions] = useState([])
  const [invoiceOptions, setInvoiceOptions] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [formData, setFormData] = useState({
    clientCode: '',
    invoiceCode: '',
    paymentCode: '',
    paymentDate: '',
    amountReceived: '',
    amountApplied: '',
    allocationMethod: 'manual',
    referenceNumber: '',
    notes: '',
  })

  useEffect(() => {
    let isActive = true

    async function loadClients() {
      try {
        const payload = await fetchJson('/api/clients/options')
        if (!isActive) {
          return
        }

        const options = Array.isArray(payload?.options) ? payload.options : []
        setClientOptions(options)
        if (!formData.clientCode && options[0]?.value) {
          setFormData((prev) => ({ ...prev, clientCode: options[0].value }))
        }
      } catch {
        if (isActive) {
          setFeedbackMessage('Unable to load client options.')
        }
      }
    }

    loadClients()

    return () => {
      isActive = false
    }
  }, [formData.clientCode])

  useEffect(() => {
    let isActive = true

    async function loadInvoices() {
      if (!formData.clientCode) {
        setInvoiceOptions([])
        return
      }

      try {
        const payload = await fetchJson(`/api/invoices/options?clientCode=${encodeURIComponent(formData.clientCode)}`)
        if (!isActive) {
          return
        }

        const options = Array.isArray(payload?.options) ? payload.options : []
        setInvoiceOptions(options)
        if (!options.some((option) => option.value === formData.invoiceCode)) {
          setFormData((prev) => ({ ...prev, invoiceCode: options[0]?.value || '' }))
        }
      } catch {
        if (isActive) {
          setInvoiceOptions([])
          setFeedbackMessage('Unable to load invoice options.')
        }
      }
    }

    loadInvoices()

    return () => {
      isActive = false
    }
  }, [formData.clientCode, formData.invoiceCode])

  const selectedInvoice = useMemo(
    () => invoiceOptions.find((option) => option.value === formData.invoiceCode),
    [invoiceOptions, formData.invoiceCode],
  )

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const submitPayment = async () => {
    setIsSubmitting(true)
    setFeedbackMessage('')

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Payment submission failed')
      }

      setFormData((prev) => ({
        ...prev,
        paymentCode: '',
        paymentDate: '',
        amountReceived: '',
        amountApplied: '',
        referenceNumber: '',
        notes: '',
      }))
      setFeedbackMessage('Payment draft saved and linked to invoice.')
    } catch {
      setFeedbackMessage('Could not save payment draft. Please verify required fields.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const detailPanel = {
    title: 'Payment Draft',
    subtitle: 'Current entry',
    content: (
      <Surface compact glass title='Payment summary' eyebrow='Draft'>
        <DetailList
          items={[
            { label: 'Client', value: clientOptions.find((item) => item.value === formData.clientCode)?.label || 'Select client' },
            { label: 'Invoice', value: selectedInvoice?.value || 'Select invoice' },
            { label: 'Outstanding', value: selectedInvoice?.outstandingAmount || '$0' },
            { label: 'Amount', value: formData.amountReceived || '$0' },
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
            <h2 className='page-title'>Payment Form</h2>
            <p className='page-copy'>Capture a payment and allocate it to a specific client invoice.</p>
          </div>
          <div className='page-actions'>
            <span className='page-badge'>{isSubmitting ? 'Submitting...' : 'Ready'}</span>
            <Button size='sm' variant='ghost' onClick={() => setFormData((prev) => ({ ...prev, notes: '' }))}>Clear Notes</Button>
            <Button size='sm' leadingDot onClick={submitPayment} disabled={isSubmitting}>Save payment</Button>
          </div>
        </header>
      }
    >
      <div className='page-stack'>
        {feedbackMessage ? <p className='page-copy'>{feedbackMessage}</p> : null}

        <SectionContainer eyebrow='Payment' title='Allocation'>
          <FormSection glass title='Payment details'>
            <SelectField
              label='Client'
              options={clientOptions.length ? clientOptions : [{ label: 'No clients', value: '' }]}
              value={formData.clientCode}
              onChange={(event) => setField('clientCode', event.target.value)}
            />
            <SelectField
              label='Invoice'
              options={invoiceOptions.length ? invoiceOptions : [{ label: 'No open invoices', value: '' }]}
              value={formData.invoiceCode}
              onChange={(event) => setField('invoiceCode', event.target.value)}
            />
            <TextInput label='Payment code' value={formData.paymentCode} onChange={(event) => setField('paymentCode', event.target.value)} />
            <TextInput label='Payment date' type='date' value={formData.paymentDate} onChange={(event) => setField('paymentDate', event.target.value)} />
            <TextInput label='Amount received' value={formData.amountReceived} onChange={(event) => setField('amountReceived', event.target.value)} />
            <TextInput label='Amount applied to invoice' value={formData.amountApplied} onChange={(event) => setField('amountApplied', event.target.value)} />
            <SelectField
              label='Allocation method'
              options={[
                { label: 'Manual', value: 'manual' },
                { label: 'Auto oldest', value: 'auto_oldest' },
                { label: 'Auto full match', value: 'auto_full_match' },
              ]}
              value={formData.allocationMethod}
              onChange={(event) => setField('allocationMethod', event.target.value)}
            />
            <TextInput label='Reference number' value={formData.referenceNumber} onChange={(event) => setField('referenceNumber', event.target.value)} />
            <TextAreaField label='Notes' value={formData.notes} onChange={(event) => setField('notes', event.target.value)} />
          </FormSection>
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default PaymentFormPage
