import RoutePlaceholderPage from './RoutePlaceholderPage'

function ReviewInboxPage({ shell }) {
  return (
    <RoutePlaceholderPage
      description="Pending change queue and diff approvals will be moved from preview into this route next."
      eyebrow="Review Inbox"
      message="No review queue has been split out yet."
      shell={shell}
      title="Admin review workspace"
    />
  )
}

export default ReviewInboxPage