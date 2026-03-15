import './App.css'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import ArAgingPage from './pages/ArAgingPage'
import ClientsPage from './pages/ClientsPage'
import ExpensesPage from './pages/ExpensesPage'
import ReviewInboxPage from './pages/ReviewInboxPage'
import AuditLogPage from './pages/AuditLogPage'
import PreviewPage from './pages/PreviewPage'
import { DEFAULT_PATH, NAV_ITEMS, getActiveNavKey } from './routes/appRoutes'

function RoutedApp() {
  const location = useLocation()
  const navigate = useNavigate()

  const shell = {
    activeKey: getActiveNavKey(location.pathname),
    navItems: NAV_ITEMS,
    onNavigate: (item) => navigate(item.path),
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate replace to={DEFAULT_PATH} />} />
      <Route path="/dashboard" element={<DashboardPage shell={shell} />} />
      <Route path="/aging" element={<ArAgingPage shell={shell} />} />
      <Route path="/clients" element={<ClientsPage shell={shell} />} />
      <Route path="/expenses" element={<ExpensesPage shell={shell} />} />
      <Route path="/review" element={<ReviewInboxPage shell={shell} />} />
      <Route path="/audit" element={<AuditLogPage shell={shell} />} />
      <Route path="/preview" element={<PreviewPage shell={shell} />} />
      <Route path="*" element={<Navigate replace to={DEFAULT_PATH} />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  )
}

export default App
