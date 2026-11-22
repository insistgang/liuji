import { NavLink } from 'react-router-dom'
import { isStaticMode } from '../../api/runtime'
import {
  Brain,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  PenTool,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react'

const navItems = [
  { to: '/daily', icon: CalendarCheck, label: '每日词表与复习', desc: '20词 · 场景图 · 原文' },
  { to: '/plan', icon: ClipboardList, label: '学习计划', desc: '到期复习 · 单项训练' },
  { to: '/vocabulary/learn', icon: Brain, label: '词汇特训与测验', desc: '看词 · 听音 · 默写' },
  { to: '/vocabulary/test', icon: Trophy, label: '词汇随堂测验', desc: '正反向 · 听音抽测' },
  { to: '/dashboard', icon: LayoutDashboard, label: '学习仪表盘', desc: '计划与数据概览' },
  { to: '/exams', icon: FileText, label: '真题练习', desc: '阅读 · 翻译 · 模考' },
  { to: '/listening', icon: Headphones, label: '听力训练', desc: '精听文稿与习题' },
  { to: '/writing', icon: PenTool, label: '写作批改', desc: 'AI 评分与润色' },
  { to: '/profile', icon: User, label: '数据备份与设置', desc: '跨设备同步 · 发音与主题' },
]

export default function Sidebar() {
  const visibleItems = navItems.filter(
    (item) =>
      !isStaticMode ||
      ['/daily', '/plan', '/vocabulary/learn', '/vocabulary/test', '/profile'].includes(item.to),
  )

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-0 h-screen">
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-6 py-5">
        <div className="app-accent-solid flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm">
          <GraduationCap size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-[var(--text-primary)]">
            六级词境 · Liuji
          </h1>
          <p className="truncate text-xs text-[var(--text-muted)]">CET-6 场景记忆与间隔复习</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto p-4" aria-label="主导航">
        {visibleItems.map(({ to, icon: Icon, label, desc }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-all ${
                isActive
                  ? 'app-accent-soft border font-semibold shadow-2xs'
                  : 'border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'app-accent-solid shadow-xs'
                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{label}</div>
                  <div className="truncate text-[11px] font-normal text-[var(--text-muted)]">{desc}</div>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--border-subtle)] p-4">
        <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-3.5 text-xs leading-5 text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
            <Sparkles size={14} className="text-[var(--accent-text)]" aria-hidden="true" />
            <span>真人词典双音发音</span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            支持美音 / 英音一键切换与 6 款护眼阅读风格，学习进度安全保存在本地浏览器。
          </p>
        </div>
      </div>
    </aside>
  )
}
