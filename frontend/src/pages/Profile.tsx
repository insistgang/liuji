import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, BookOpen, FileText, PenTool } from 'lucide-react'

export default function Profile() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={32} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user.username}</h2>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
        <button
          onClick={() => navigate('/vocabulary/test')}
          className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
        >
          <BookOpen size={20} className="text-blue-500" />
          <span className="text-gray-900">词汇进度</span>
          <span className="ml-auto text-gray-400">&rarr;</span>
        </button>
        <button
          onClick={() => navigate('/exams')}
          className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
        >
          <FileText size={20} className="text-purple-500" />
          <span className="text-gray-900">考试记录</span>
          <span className="ml-auto text-gray-400">&rarr;</span>
        </button>
        <button
          onClick={() => navigate('/writing')}
          className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
        >
          <PenTool size={20} className="text-pink-500" />
          <span className="text-gray-900">写作记录</span>
          <span className="ml-auto text-gray-400">&rarr;</span>
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
      >
        <LogOut size={20} />
        退出登录
      </button>
    </div>
  )
}
