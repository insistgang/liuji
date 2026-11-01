import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
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

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
