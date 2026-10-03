import { NavLink } from 'react-router-dom'
import { BookOpen, Headphones, PenTool, FileText, BarChart3, User } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: BarChart3, label: '首页' },
  { to: '/vocabulary/learn', icon: BookOpen, label: '词汇' },
  { to: '/exams', icon: FileText, label: '真题' },
  { to: '/listening', icon: Headphones, label: '听力' },
  { to: '/writing', icon: PenTool, label: '写作' },
  { to: '/profile', icon: User, label: '我的' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-2 text-xs ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            <Icon size={18} />
            <span className="mt-1">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
