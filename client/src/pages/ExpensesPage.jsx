import RoutePlaceholderPage from './RoutePlaceholderPage'

function ExpensesPage({ shell }) {
  return (
    <RoutePlaceholderPage
      description="Expense-category breakdown and cash outflow analysis will be added after AR routing stabilization."
      eyebrow="Expenses"
      message="No expenses widgets have been extracted yet."
      shell={shell}
      title="Expense tracking workspace"
    />
  )
}

export default ExpensesPage