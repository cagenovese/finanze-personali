import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import Import from '@/pages/Import'
import Transactions from '@/pages/Transactions'
import Budget from '@/pages/Budget'
import Splitwise from '@/pages/Splitwise'
import MonthlyReport from '@/pages/MonthlyReport'

export default function App() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <div className="flex h-screen bg-bg-base text-text-primary font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/import"       element={<Import />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budget"       element={<Budget />} />
            <Route path="/splitwise"    element={<Splitwise />} />
            <Route path="/report"       element={<MonthlyReport />} />
          </Routes>
        </main>
      </div>
    </MemoryRouter>
  )
}
