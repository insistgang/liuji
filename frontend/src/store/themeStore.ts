import { useEffect } from 'react'
import { create } from 'zustand'

export type Theme = 'light' | 'sepia' | 'forest' | 'sakura' | 'dark' | 'obsidian'

export interface ThemeMeta {
  id: Theme
  name: string
  subtitle: string
  mode: 'light' | 'dark'
  canvasPreview: string
  surfacePreview: string
  accentPreview: string
}

export const THEMES: readonly ThemeMeta[] = [
  {
    id: 'light',
    name: '晨雾青岚',
    subtitle: '清爽青绿 · 默认日间',
    mode: 'light',
    canvasPreview: '#f3f7f8',
    surfacePreview: '#ffffff',
    accentPreview: '#0d9488',
  },
  {
    id: 'sepia',
    name: '羊皮书卷',
    subtitle: '暖纸衬线 · 词典精读',
    mode: 'light',
    canvasPreview: '#f5efe2',
    surfacePreview: '#fcf9f2',
    accentPreview: '#b45309',
  },
  {
    id: 'forest',
    name: '森屿薄荷',
    subtitle: '自然绿意 · 久看护眼',
    mode: 'light',
    canvasPreview: '#ebf3ee',
    surfacePreview: '#f9fcfa',
    accentPreview: '#15803d',
  },
  {
    id: 'sakura',
    name: '浮光樱粉',
    subtitle: '柔雾樱霞 · 轻盈温暖',
    mode: 'light',
    canvasPreview: '#fcf2f5',
    surfacePreview: '#ffffff',
    accentPreview: '#db2777',
  },
  {
    id: 'dark',
    name: '极夜深空',
    subtitle: '深海暗色 · 夜间专注',
    mode: 'dark',
    canvasPreview: '#090f1d',
    surfacePreview: '#111827',
    accentPreview: '#2dd4bf',
  },
  {
    id: 'obsidian',
    name: '墨金黑曜',
    subtitle: '暖墨暗金 · 深夜书房',
    mode: 'dark',
    canvasPreview: '#12100e',
    surfacePreview: '#1c1916',
    accentPreview: '#f59e0b',
  },
] as const

export const THEME_IDS: readonly Theme[] = THEMES.map((t) => t.id)
export const THEME_STORAGE_KEY = 'liuji-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

export function isDarkTheme(theme: Theme): boolean {
  return theme === 'dark' || theme === 'obsidian'
}

export function getThemeMeta(theme: Theme): ThemeMeta {
  return THEMES.find((item) => item.id === theme) ?? THEMES[0]
}

export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return isValidTheme(value) ? value : null
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
  const dark = isDarkTheme(theme)
  root.dataset.theme = theme
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

interface ThemeState {
  theme: Theme
  lastLight: Theme
  lastDark: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const initialTheme: Theme = typeof window !== 'undefined' ? resolveTheme() : 'light'

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  lastLight: isDarkTheme(initialTheme) ? 'light' : initialTheme,
  lastDark: isDarkTheme(initialTheme) ? initialTheme : 'dark',
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // 隐私模式下写入失败时仍切换当前会话的显示
    }
    applyTheme(theme)
    set((state) => ({
      theme,
      lastLight: isDarkTheme(theme) ? state.lastLight : theme,
      lastDark: isDarkTheme(theme) ? theme : state.lastDark,
    }))
  },
  toggle: () => {
    const { theme, lastLight, lastDark, setTheme } = get()
    setTheme(isDarkTheme(theme) ? lastLight : lastDark)
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
