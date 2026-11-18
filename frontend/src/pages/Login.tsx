import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import ThemeToggle from '../components/layout/ThemeToggle'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError((isAxiosError<{ detail?: string }>(err) && err.response?.data?.detail) || '登录失败，请检查账号密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-canvas flex min-h-screen items-center justify-center px-4 py-12">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle showAccentSwitch={false} />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="app-accent-solid mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-md">
            <GraduationCap size={28} aria-hidden="true" />
          </div>
          <h1 className="headword-font text-3xl font-bold text-[var(--text-primary)]">六级词境 · Liuji</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">登录你的 CET-6 备考学习空间</p>
        </div>

        <form onSubmit={handleSubmit} className="app-card space-y-5 rounded-3xl p-8">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="app-input w-full rounded-xl px-4 py-3 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="app-input w-full rounded-xl px-4 py-3 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="app-accent-solid w-full rounded-xl py-3.5 text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            {loading ? '登录中...' : '立即登录'}
          </button>
          <p className="text-center text-sm text-[var(--text-secondary)]">
            还没有账号？{' '}
            <Link to="/register" className="font-semibold text-[var(--accent-text)] hover:underline">
              免费注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
