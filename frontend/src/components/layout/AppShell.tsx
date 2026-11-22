import { useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ThemeToggle from './ThemeToggle'
import { isStaticMode } from '../../api/runtime'

export default function AppShell() {
  const mainRef = useRef<HTMLElement>(null)
  return (
    <div className="app-canvas flex min-h-screen">
      <a href="#main-content" className="app-accent-solid sr-only z-50 rounded-xl px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        onClick={(event) => { event.preventDefault(); mainRef.current?.focus() }}>
        跳到主要内容
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar sticky top-0 z-40 px-3 py-2.5 sm:px-4 md:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <span className="app-accent-solid flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs md:hidden">
                <GraduationCap size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)] md:hidden">六级词境</p>
                <div className="hidden items-center gap-2 md:flex">
                  <span className="app-accent-soft rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    CET-6 备考
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {isStaticMode ? '本地离线记忆模式 · 真人词典双音发音' : '全栈同步模式 · 真人词典双音发音'}
                  </span>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main id="main-content" ref={mainRef} tabIndex={-1} className="pb-main-safe min-w-0 flex-1 scroll-mt-16">
          <div className="mx-auto max-w-5xl px-3.5 py-4 sm:px-4 sm:py-5 md:px-8 md:py-7">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
