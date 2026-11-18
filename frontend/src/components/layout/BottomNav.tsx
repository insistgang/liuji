import { NavLink } from 'react-router-dom'
import { isStaticMode } from '../../api/runtime'
import { Brain, CalendarCheck, FileText, Headphones, PenTool, Trophy, User } from 'lucide-react'

const navItems = [
  { to: '/daily', icon: CalendarCheck, label: '每日词表' },
  { to: '/vocabulary/learn', icon: Brain, label: '词汇特训' },
  { to: '/vocabulary/test', icon: Trophy, label: '随堂测验' },
  { to: '/exams', icon: FileText, label: '真题' },
  { to: '/listening', icon: Headphones, label: '听力' },
  { to: '/writing', icon: PenTool, label: '写作' },
  { to: '/profile', icon: User, label: '备份设置' },
]

export default function BottomNav() {
  const visibleItems = navItems.filter(
    (item) =>
      !isStaticMode ||
      ['/daily', '/vocabulary/learn', '/vocabulary/test', '/profile'].includes(item.to),
  )

  return (
    <nav
      aria-label="底部导航"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] backdrop-blur-xl pb-safe"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2 py-1.5">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-15 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                isActive
                  ? 'app-accent-soft text-[var(--accent-text)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
