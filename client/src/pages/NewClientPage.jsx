import { useMemo, useState } from 'react'
import AppShell from '../components/shell/AppShell'
import Button from '../components/primitives/Button'
import Surface from '../components/primitives/Surface'
import FormSection from '../components/composition/FormSection'
import SectionContainer from '../components/composition/SectionContainer'
import DetailList from '../components/composition/DetailList'
import { SelectField, TextAreaField, TextInput } from '../components/primitives/Fields'
import newClientSampleData from './data/newClientSampleData.json'
import pageCopy from './data/pageCopy.json'
import { getShellBrandTitle, normalizePageCopy } from '../utils/pageCopyContracts'
import { normalizeNewClientSampleData } from '../utils/sampleDataContracts'

const normalizedData = normalizeNewClientSampleData(newClientSampleData)
const page = normalizePageCopy('newClientForm', pageCopy)
const shellBrandTitle = getShellBrandTitle(pageCopy)

function NewClientPage({ shell }) {
  const [formData, setFormData] = useState(normalizedData.formDefaults)
  const [savedAt, setSavedAt] = useState('Not saved')

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const summaryItems = useMemo(() => ([
    { label: 'Client', value: formData.clientName || 'Untitled' },
    { label: 'Contact', value: formData.primaryContact || 'Pending' },
    { label: 'Company', value: formData.company || 'Pending' },
    { label: 'Terms', value: formData.paymentTerms || 'Pending' },
  ]), [formData.clientName, formData.company, formData.paymentTerms, formData.primaryContact])

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
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFormData(normalizedData.formDefaults)}
            >
              Clear
            </Button>
            <Button
              size="sm"
              leadingDot
              onClick={() => setSavedAt('Saved now')}
            >
              Save draft
            </Button>
          </div>
        </header>
      }
    >
      <div className="page-stack">
        <SectionContainer eyebrow={page.sections.basic.eyebrow} title={page.sections.basic.title}>
          <FormSection glass title={page.sections.basic.formTitle}>
            <TextInput label="Client name" value={formData.clientName} onChange={(event) => setField('clientName', event.target.value)} />
            <TextInput label="Primary contact" value={formData.primaryContact} onChange={(event) => setField('primaryContact', event.target.value)} />
            <TextInput label="Email" type="email" value={formData.email} onChange={(event) => setField('email', event.target.value)} />
            <TextInput label="Phone" value={formData.phone} onChange={(event) => setField('phone', event.target.value)} />
          </FormSection>
        </SectionContainer>

        <SectionContainer eyebrow={page.sections.billing.eyebrow} title={page.sections.billing.title}>
          <FormSection glass title={page.sections.billing.formTitle}>
            <SelectField label="Company" options={normalizedData.companyOptions} value={formData.company} onChange={(event) => setField('company', event.target.value)} />
            <SelectField label="Billing cycle" options={normalizedData.billingCycleOptions} value={formData.billingCycle} onChange={(event) => setField('billingCycle', event.target.value)} />
            <SelectField label="Payment terms" options={normalizedData.paymentTermOptions} value={formData.paymentTerms} onChange={(event) => setField('paymentTerms', event.target.value)} />
            <TextAreaField label="Notes" value={formData.notes} onChange={(event) => setField('notes', event.target.value)} />
          </FormSection>
        </SectionContainer>
      </div>
    </AppShell>
  )
}

export default NewClientPage
