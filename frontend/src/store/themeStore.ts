import { useEffect } from 'react'
import { create } from 'zustand'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'liuji-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function readSystemTheme(): Theme {
  try {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function resolveTheme(): Theme {
  return readStoredTheme() ?? readSystemTheme()
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: resolveTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // 隐私模式下写入失败时仍切换当前会话的显示
    }
    applyTheme(theme)
    set({ theme })
  },
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))

/** 同步主题到 DOM，并在用户未手动选择时跟随系统偏好变化 */
export function useThemeEffect() {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    let media: MediaQueryList
    try {
      media = window.matchMedia(DARK_QUERY)
    } catch {
      return
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (readStoredTheme()) return
      const next: Theme = event.matches ? 'dark' : 'light'
      applyTheme(next)
      useThemeStore.setState({ theme: next })
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
}
