import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { writingApi, type WritingPrompt, type WritingSubmission } from '../api/writing'
import { ArrowLeft, Send, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function WritingEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null)
  const [essay, setEssay] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submission, setSubmission] = useState<WritingSubmission | null>(null)
  const [showSample, setShowSample] = useState(false)

  useEffect(() => {
    if (!id) return
    writingApi
      .getPrompt(Number(id))
      .then(({ data }) => setPrompt(data.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  if (!prompt) {
    return <div className="text-center py-20 text-gray-500">题目未找到</div>
  }

  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length

  const handleSubmit = async () => {
    if (essay.trim().length < 50) {
      alert('作文字数太少，请继续写作')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await writingApi.submit(prompt.id, essay)
      setSubmission(data.data || null)
    } catch {
      alert('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const parseJson = (str: string | null) => {
    if (!str) return []
    try {
      return JSON.parse(str)
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/writing')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={20} />
        返回列表
      </button>

      {/* Prompt */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-3">{prompt.title}</h1>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{prompt.prompt_text}</p>
        {prompt.prompt_cn && <p className="text-gray-500 text-sm mt-2">{prompt.prompt_cn}</p>}
        {prompt.word_limit && (
          <p className="text-sm text-gray-500 mt-2">字数要求: {prompt.word_limit} 词</p>
        )}
        {prompt.tips && (
          <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <strong>写作提示:</strong> {prompt.tips}
          </div>
        )}
      </div>

      {/* Editor */}
      {!submission && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none leading-relaxed"
            placeholder="Write your essay here..."
          />
          <div className="flex items-center justify-between mt-3">
            <span className={`text-sm ${wordCount < 150 ? 'text-red-500' : 'text-gray-500'}`}>
              字数: {wordCount} {prompt.word_limit && `(要求: ${prompt.word_limit})`}
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting || essay.trim().length < 50}
              className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
              {submitting ? '批改中...' : '提交批改'}
            </button>
          </div>
        </div>
      )}

      {/* AI Feedback */}
      {submission && (
        <>
          <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="text-green-600" size={24} />
            <div>
              <p className="font-semibold text-green-800">提交成功！</p>
              <p className="text-sm text-green-600">字数: {submission.word_count}</p>
            </div>
          </div>

          {/* Score */}
          {submission.ai_score !== null && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">AI 评分</h2>
              <div className="text-5xl font-bold text-pink-600">{submission.ai_score}</div>
              <div className="text-gray-500 mt-1">/ 15 分</div>
            </div>
          )}

          {/* Overall comment */}
          {submission.ai_feedback && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">总体评价</h2>
              <p className="text-gray-700 leading-relaxed">{submission.ai_feedback}</p>
            </div>
          )}

          {/* Grammar issues */}
          {parseJson(submission.grammar_issues).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">语法问题</h2>
              <div className="space-y-3">
                {parseJson(submission.grammar_issues).map((issue: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-red-400 pl-4">
                    <p className="text-red-600 text-sm">原文: {issue.original}</p>
                    <p className="text-green-600 text-sm">修正: {issue.corrected}</p>
                    <p className="text-gray-500 text-sm">{issue.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vocabulary suggestions */}
          {parseJson(submission.vocabulary_suggestions).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">词汇改进建议</h2>
              <div className="space-y-3">
                {parseJson(submission.vocabulary_suggestions).map((s: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-blue-400 pl-4">
                    <p className="text-gray-700 text-sm">
                      <span className="text-red-500 line-through">{s.original_word}</span>
                      {' -> '}
                      <span className="text-green-600 font-medium">{s.suggestion}</span>
                    </p>
                    <p className="text-gray-500 text-sm">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Structure feedback */}
          {submission.structure_feedback && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">结构反馈</h2>
              <p className="text-gray-700 leading-relaxed">{submission.structure_feedback}</p>
            </div>
          )}

          {/* Sample essay toggle */}
          {prompt.sample_essay && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <button
                onClick={() => setShowSample(!showSample)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                {showSample ? <EyeOff size={18} /> : <Eye size={18} />}
                {showSample ? '隐藏范文' : '查看范文'}
              </button>
              {showSample && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {prompt.sample_essay}
                </div>
              )}
            </div>
          )}

          {/* Retry */}
          <div className="text-center">
            <button
              onClick={() => {
                setSubmission(null)
                setEssay('')
              }}
              className="px-6 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700"
            >
              重新写作
            </button>
          </div>
        </>
      )}
    </div>
  )
}
