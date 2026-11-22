import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from './store/authStore'
import { useThemeEffect } from './store/themeStore'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import VocabularyLearn from './pages/VocabularyLearn'
import VocabularyReview from './pages/VocabularyReview'
import VocabularyTest from './pages/VocabularyTest'
import ExamList from './pages/ExamList'
import ExamDetail from './pages/ExamDetail'
import ExamPractice from './pages/ExamPractice'
import ExamResult from './pages/ExamResult'
import ListeningList from './pages/ListeningList'
import ListeningPractice from './pages/ListeningPractice'
import WritingList from './pages/WritingList'
import WritingEditor from './pages/WritingEditor'
import Profile from './pages/Profile'
import DailyWords from './pages/DailyWords'
import { isStaticMode } from './api/runtime'

const StudyPlan = lazy(() => import('./pages/StudyPlan'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="app-canvas flex min-h-screen items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
        <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
        <span>正在初始化学习环境…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  const init = useAuthStore((s) => s.init)
  useThemeEffect()

  useEffect(() => {
    init()
  }, [init])

  const Router = isStaticMode ? HashRouter : BrowserRouter
  return (
    <Router basename={isStaticMode ? undefined : import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={isStaticMode ? '/daily' : '/dashboard'} replace />} />
          <Route path="daily" element={<DailyWords />} />
          <Route path="plan" element={
            <Suspense fallback={<p role="status" className="p-4 text-sm text-[var(--text-secondary)]">正在加载学习计划…</p>}>
              <StudyPlan />
            </Suspense>
          } />
          <Route path="dashboard" element={isStaticMode ? <Navigate to="/daily" replace /> : <Dashboard />} />
          <Route path="vocabulary/learn" element={<VocabularyLearn />} />
          <Route path="vocabulary/review" element={<VocabularyReview />} />
          <Route path="vocabulary/test" element={<VocabularyTest />} />
          <Route path="exams" element={<ExamList />} />
          <Route path="exams/:id" element={<ExamDetail />} />
          <Route path="exams/:id/:section" element={<ExamPractice />} />
          <Route path="exams/attempt/:attemptId/result" element={<ExamResult />} />
          <Route path="listening" element={<ListeningList />} />
          <Route path="listening/:id" element={<ListeningPractice />} />
          <Route path="writing" element={<WritingList />} />
          <Route path="writing/:id" element={<WritingEditor />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to={isStaticMode ? '/daily' : '/dashboard'} replace />} />
        </Route>
      </Routes>
    </Router>
  )
}
