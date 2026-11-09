import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ThemeToggle from './ThemeToggle'

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-16 md:pb-0">
        <div className="flex items-center justify-end px-4 pt-4 md:px-6 md:pt-5">
          <ThemeToggle />
        </div>
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
