import RoutePlaceholderPage from './RoutePlaceholderPage'

function ClientsPage({ shell }) {
  return (
    <RoutePlaceholderPage
      description="Client ledger, balances, and payment history timeline will be extracted in the next cycle."
      eyebrow="Client List"
      message="No client panel has been split out yet."
      shell={shell}
      title="Client history workspace"
    />
  )
}

export default ClientsPage