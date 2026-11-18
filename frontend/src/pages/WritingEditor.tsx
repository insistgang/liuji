import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { writingApi, type WritingPrompt, type WritingSubmission } from '../api/writing'
import { ArrowLeft, Send, Loader2, CheckCircle, Eye, EyeOff, RotateCcw } from 'lucide-react'

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
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  if (!prompt) {
    return <div className="app-card rounded-2xl py-16 text-center text-sm text-[var(--text-muted)]">题目未找到</div>
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

  const parseJson = <T,>(str: string | null): T[] => {
    if (!str) return []
    try {
      return JSON.parse(str) as T[]
    } catch {
      return []
    }
  }

  const grammarIssues = submission
    ? parseJson<{ original: string; corrected: string; explanation: string }>(submission.grammar_issues)
    : []
  const vocabSuggestions = submission
    ? parseJson<{ original_word: string; suggestion: string; reason: string }>(submission.vocabulary_suggestions)
    : []

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/writing')}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={18} />
        返回列表
      </button>

      <div className="app-card rounded-3xl p-6 sm:p-8">
        <h1 className="headword-font text-xl font-bold text-[var(--text-primary)]">{prompt.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-primary)]">
          {prompt.prompt_text}
        </p>
        {prompt.prompt_cn && (
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{prompt.prompt_cn}</p>
        )}
        {prompt.word_limit && (
          <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">建议词数：{prompt.word_limit} 词</p>
        )}
        {prompt.tips && (
          <div className="app-accent-soft mt-4 rounded-xl border p-3.5 text-xs leading-6">
            <strong>审题与结构提示：</strong> {prompt.tips}
          </div>
        )}
      </div>

      {!submission && (
        <div className="app-card rounded-3xl p-6 sm:p-8">
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            className="app-input h-64 w-full resize-none rounded-2xl p-4 text-sm leading-7"
            placeholder="Write your CET-6 essay here..."
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span
              className={`text-xs font-medium ${
                wordCount < 150 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              当前词数：{wordCount} 词 {prompt.word_limit && `（目标 ${prompt.word_limit} 词）`}
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || essay.trim().length < 50}
              className="app-accent-solid inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              <Send size={16} />
              {submitting ? 'AI 批改中...' : '提交批改'}
            </button>
          </div>
        </div>
      )}

      {submission && (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={22} />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">批改已完成！</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">提交总词数：{submission.word_count} 词</p>
            </div>
          </div>

          {submission.ai_score !== null && (
            <div className="app-card rounded-3xl p-6 text-center">
              <h2 className="text-sm font-semibold text-[var(--text-muted)]">AI 综合评分</h2>
              <div className="mt-2 text-5xl font-bold text-[var(--accent-text)]">{submission.ai_score}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">/ 15 分（六级作文满分制）</div>
            </div>
          )}

          {submission.ai_feedback && (
            <div className="app-card rounded-2xl p-6">
              <h2 className="mb-2.5 text-base font-bold text-[var(--text-primary)]">总体评语</h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">{submission.ai_feedback}</p>
            </div>
          )}

          {grammarIssues.length > 0 && (
            <div className="app-card rounded-2xl p-6">
              <h2 className="mb-3.5 text-base font-bold text-[var(--text-primary)]">语法与表达修正</h2>
              <div className="space-y-3">
                {grammarIssues.map((issue, idx) => (
                  <div key={idx} className="rounded-r-xl border-l-4 border-rose-500 bg-[var(--bg-subtle)] p-3.5 text-xs leading-6">
                    <p className="text-rose-600 dark:text-rose-400">原文：{issue.original}</p>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">修正：{issue.corrected}</p>
                    <p className="text-[var(--text-secondary)]">{issue.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vocabSuggestions.length > 0 && (
            <div className="app-card rounded-2xl p-6">
              <h2 className="mb-3.5 text-base font-bold text-[var(--text-primary)]">高分词汇升级建议</h2>
              <div className="space-y-3">
                {vocabSuggestions.map((s, idx) => (
                  <div key={idx} className="rounded-r-xl border-l-4 border-[var(--accent)] bg-[var(--bg-subtle)] p-3.5 text-xs leading-6">
                    <p className="text-[var(--text-primary)]">
                      <span className="text-rose-500 line-through">{s.original_word}</span>
                      {' → '}
                      <span className="font-semibold text-[var(--accent-text)]">{s.suggestion}</span>
                    </p>
                    <p className="text-[var(--text-secondary)]">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submission.structure_feedback && (
            <div className="app-card rounded-2xl p-6">
              <h2 className="mb-2.5 text-base font-bold text-[var(--text-primary)]">篇章结构点评</h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">{submission.structure_feedback}</p>
            </div>
          )}

          {prompt.sample_essay && (
            <div className="app-card rounded-2xl p-6">
              <button
                type="button"
                onClick={() => setShowSample(!showSample)}
                className="app-muted-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
              >
                {showSample ? <EyeOff size={15} /> : <Eye size={15} />}
                {showSample ? '收起参考范文' : '查看高分范文'}
              </button>
              {showSample && (
                <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-5 text-sm leading-7 text-[var(--text-secondary)]">
                  {prompt.sample_essay}
                </div>
              )}
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setSubmission(null)
                setEssay('')
              }}
              className="app-accent-solid inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold"
            >
              <RotateCcw size={16} />
              重新写作本篇
            </button>
          </div>
        </>
      )}
    </div>
  )
}
