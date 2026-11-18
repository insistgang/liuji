import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import ThemeToggle from '../components/layout/ThemeToggle'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await register(username, email, password)
      navigate('/login')
    } catch (err: unknown) {
      setError((isAxiosError<{ detail?: string }>(err) && err.response?.data?.detail) || '注册失败，请稍后重试')
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
          <p className="mt-2 text-sm text-[var(--text-secondary)]">创建账号，开启高效六级备考计划</p>
        </div>

        <form onSubmit={handleSubmit} className="app-card space-y-4 rounded-3xl p-8">
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
              placeholder="设置用户名"
              className="app-input w-full rounded-xl px-4 py-3 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              placeholder="至少 6 位字符"
              className="app-input w-full rounded-xl px-4 py-3 text-sm"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className="app-input w-full rounded-xl px-4 py-3 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="app-accent-solid mt-2 w-full rounded-xl py-3.5 text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            {loading ? '注册中...' : '创建账号'}
          </button>
          <p className="text-center text-sm text-[var(--text-secondary)]">
            已有账号？{' '}
            <Link to="/login" className="font-semibold text-[var(--accent-text)] hover:underline">
              返回登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
