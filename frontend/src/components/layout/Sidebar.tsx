import { NavLink } from 'react-router-dom'
import { isStaticMode } from '../../api/runtime'
import { BookOpen, Headphones, PenTool, FileText, BarChart3, User } from 'lucide-react'

const navItems = [
  { to: '/daily', icon: BookOpen, label: '每日词表与复习' },
  { to: '/dashboard', icon: BarChart3, label: '仪表盘' },
  { to: '/vocabulary/learn', icon: BookOpen, label: '词汇学习' },
  { to: '/exams', icon: FileText, label: '真题练习' },
  { to: '/listening', icon: Headphones, label: '听力训练' },
  { to: '/writing', icon: PenTool, label: '写作批改' },
  { to: '/profile', icon: User, label: '个人中心' },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 min-h-screen">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">六级学习系统</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter(item => !isStaticMode || ['/daily', '/vocabulary/learn'].includes(item.to)).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-950 hover:text-gray-900 dark:hover:text-slate-100'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
