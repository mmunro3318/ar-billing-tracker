import { useMemo, useState } from 'react'
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

const normalizedData = normalizeInvoiceFormSampleData(invoiceFormSampleData)
const page = normalizePageCopy('invoiceForm', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

function InvoiceFormPage({ shell }) {
  const [formData, setFormData] = useState(normalizedData.formDefaults)
  const [savedAt, setSavedAt] = useState('Not saved')

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const summaryItems = useMemo(() => ([
    { label: 'Invoice', value: formData.invoiceCode || 'Draft' },
    { label: 'Client', value: formData.client || 'Pending' },
    { label: 'Billed', value: formData.billedAmount || '$0.00' },
    { label: 'Status', value: formData.status || 'Pending' },
  ]), [formData.billedAmount, formData.client, formData.invoiceCode, formData.status])

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
        <SectionContainer eyebrow={page.sections.invoice.eyebrow} title={page.sections.invoice.title}>
          <FormSection glass title={page.sections.invoice.formTitle}>
            <TextInput label="Invoice code" value={formData.invoiceCode} onChange={(event) => setField('invoiceCode', event.target.value)} />
            <SelectField label="Client" options={normalizedData.clientOptions} value={formData.client} onChange={(event) => setField('client', event.target.value)} />
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
      </div>
    </AppShell>
  )
}

export default InvoiceFormPage
