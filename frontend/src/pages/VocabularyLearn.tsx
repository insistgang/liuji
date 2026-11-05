import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Volume2 } from 'lucide-react'
import LearningFeedback from '../components/LearningFeedback'
import { buildChoices, summarizeDefinition } from '../lib/quiz'
import { addDays, day, REVIEW_INTERVALS, reviewStage, useDailyLibrary, useDailyRecords, type ReviewQuality } from '../store/dailyLibrary'

const RATINGS: { quality: ReviewQuality; label: string; hint: string; color: string }[] = [
  { quality: 1, label: '忘记', hint: '今天再练', color: 'bg-red-500 hover:bg-red-600' },
  { quality: 3, label: '有点难', hint: '保持当前档位', color: 'bg-amber-500 hover:bg-amber-600' },
  { quality: 4, label: '记得', hint: '进入下一档', color: 'bg-teal-600 hover:bg-teal-700' },
  { quality: 5, label: '很熟', hint: '直接跳过一档', color: 'bg-emerald-600 hover:bg-emerald-700' },
]

type Answer = { wordId: string; kind: 'correct' | 'wrong'; wrongChoiceId?: string }

export default function VocabularyLearn({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const { library, error } = useDailyLibrary()
  const { records, storageError, save } = useDailyRecords()
  const [mode, setMode] = useState(reviewOnly ? 'review' : 'learn')
  const [selected, setSelected] = useState('')
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [sessionQueue, setSessionQueue] = useState<string[] | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'retry' | 'error'; sequence: number } | null>(null)
  const today = day()

  if (error) return <div role="alert" className="p-8 text-red-700">{error}。请刷新重试。</div>
  if (!library) return <div className="p-8">正在读取你的每日词库…</div>
  const lesson = library.lessons.find(item => item.date === selected) || library.lessons.find(item => item.date <= today) || library.lessons[0]
  const all = library.lessons.flatMap(item => item.words.map(word => ({ ...word, date: item.date })))
  const due = all.filter(word => records[word.id]?.due <= today).sort((a, b) =>
    (attempts[a.id] || 0) - (attempts[b.id] || 0) || records[a.id].due.localeCompare(records[b.id].due))
  const unlearned = lesson.words.filter(word => !records[word.id])
  const queueIds = sessionQueue ?? unlearned.map(word => word.id)
  const current = mode === 'review' ? due[0] : all.find(word => word.id === queueIds[0])
  const revealed = current ? revealedId === current.id : false
  const result = current && answer?.wordId === current.id ? answer : null
  const completedToday = all.filter(word => records[word.id]?.reviewed.includes(today) && records[word.id].interval > 0).length
  const forecast = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(today, offset)
    return { date, count: all.filter(word => records[word.id]?.due === date).length }
  })
  const options = current ? buildChoices(current, all) : []

  function changeMode(next: string) {
    setMode(next)
    setSessionQueue(null)
    setRevealedId(null)
    setAnswer(null)
    setFeedback(null)
  }

  function changeLesson(date: string) {
    setSelected(date)
    setSessionQueue(null)
    setRevealedId(null)
    setAnswer(null)
  }

  function notify(message: string, tone: 'success' | 'retry' | 'error') {
    setFeedback(previous => ({ message, tone, sequence: (previous?.sequence || 0) + 1 }))
  }

  function speak(word: string) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  function answerChoice(choiceId: string) {
    if (!current || result) return
    const choice = options.find(option => option.word.id === choiceId)
    if (!choice) return
    if (!sessionQueue) setSessionQueue(unlearned.map(word => word.id))
    if (choice.correct) {
      const record = save(current, true, 4)
      if (!record) {
        notify(`${current.word} 未保存，请检查浏览器存储权限后重试。`, 'error')
        return
      }
      setAnswer({ wordId: current.id, kind: 'correct' })
      notify(`${current.word} 记住了！下次复习：${record.due}。`, 'success')
      return
    }
    const record = save(current, false, 1)
    if (!record) {
      notify(`${current.word} 未保存，请检查浏览器存储权限后重试。`, 'error')
      return
    }
    setAnswer({ wordId: current.id, kind: 'wrong', wrongChoiceId: choiceId })
    notify(`${current.word} 答错了，已加入今天的重练队列。`, 'retry')
  }

  function continueAfterAnswer() {
    if (!current || !result) return
    const ids = sessionQueue ?? unlearned.map(word => word.id)
    setSessionQueue(result.kind === 'correct' ? ids.filter(id => id !== current.id) : [...ids.slice(1), current.id])
    setRevealedId(null)
    setAnswer(null)
  }

  function rate(quality: ReviewQuality) {
    if (!current || !revealed) return
    const record = save(current, quality >= 4, quality)
    if (!record) {
      notify(`${current.word} 未保存，请检查浏览器存储权限后重试。`, 'error')
      return
    }
    setAttempts(value => ({ ...value, [current.id]: (value[current.id] || 0) + 1 }))
    setRevealedId(null)
    const label = RATINGS.find(item => item.quality === quality)?.label
    const sameDay = record.due <= today
    notify(quality === 1
      ? `${current.word} 已加入今天的重练队列，稍后再考一次。`
      : sameDay
        ? `${current.word}（${label}）今天已复习过，保持第 ${reviewStage(record)} 档，明天继续。`
        : `${current.word}（${label}）已保存，下次复习：${record.due}，第 ${reviewStage(record)} 档。`, 'success')
  }

  return <div className="mx-auto max-w-3xl space-y-6 p-2 md:p-4">
    <header className="rounded-3xl bg-slate-900 p-6 text-white md:p-8">
      <p className="text-sm text-teal-300">来自你的「每日英语单词」知识库</p>
      <h1 className="mt-3 text-3xl font-bold">词汇学习与间隔复习</h1>
      <p className="mt-4 leading-7 text-slate-300">四选一释义测验 + 记忆强度评级，像「默默背单词」一样用排除法记住每个词。</p>
      <div className="mt-5 flex flex-wrap gap-5 text-sm"><span>本期待学 {unlearned.length}</span><span>到期复习 {due.length}</span><span>今天记住 {completedToday} 词</span></div>
    </header>
    <p className="text-sm leading-6 text-slate-500">复习间隔采用递增档位：{REVIEW_INTERVALS.join(' → ')} 天。评级「记得」进入下一档，「很熟」直接跳过一档，「有点难」保持当前档位，「忘记」当天重练。进度与每日词表共用，仅保存在当前浏览器。</p>
    {storageError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{storageError}</p>}
    <div className="flex flex-wrap gap-3">
      <button onClick={() => changeMode('learn')} className={`rounded-full px-5 py-2 ${mode === 'learn' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}>学习每日词汇</button>
      <button onClick={() => changeMode('review')} className={`rounded-full px-5 py-2 ${mode === 'review' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}>到期复习（{due.length}）</button>
      <Link to="/daily" className="px-3 py-2 text-teal-700 underline underline-offset-4">词表、配图与完整资料</Link>
    </div>
    {mode === 'learn' && <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="vocabulary-lesson">选择每日词表</label>
      <select id="vocabulary-lesson" value={lesson.date} onChange={event => changeLesson(event.target.value)} className="max-w-full rounded-xl border bg-white p-3">
        {library.lessons.map(item => <option key={item.date} value={item.date}>{item.date} · {item.words.length} 词</option>)}
      </select>
      {lesson.date !== today && <p className="text-sm text-amber-700">这是 {lesson.date} 的历史词表，不是今天新生成的词表。</p>}
    </div>}
    {feedback && <LearningFeedback key={feedback.sequence} message={feedback.message} tone={feedback.tone} onDismiss={() => setFeedback(null)} />}
    {current ? <article key={current.id} className="feedback-enter rounded-3xl border bg-white p-6 shadow-sm md:p-8">
      <p className="text-sm text-slate-500">{current.id.split(':')[0]} · {current.group} · {mode === 'review' ? `本轮还剩 ${due.length} 词` : `本轮还剩 ${queueIds.length} 词`}</p>
      <div className="mt-4 flex items-start gap-3">
        <h2 className="min-w-0 flex-1 break-words text-4xl font-bold text-slate-900">{current.word}</h2>
        <button type="button" onClick={() => speak(current.word)} aria-label={`朗读 ${current.word}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Volume2 size={19} aria-hidden="true" /></button>
      </div>
      <p className="mt-3 break-words text-slate-500">{current.phonetic}</p>
      {mode === 'review' && <p className="mt-3 text-sm text-amber-700">计划复习日：{records[current.id].due} · 第 {reviewStage(records[current.id])} 档</p>}
      {mode === 'learn' && !revealed && <button className="mt-8 w-full rounded-xl bg-teal-50 px-5 py-4 font-medium text-teal-800" onClick={() => setRevealedId(current.id)}>先回忆，再选出正确释义</button>}
      {mode === 'learn' && revealed && !result && <div className="mt-6 space-y-3">
        <p className="text-sm text-slate-500">选出下面正确的中文释义：</p>
        <div className="grid gap-3">
          {options.map(option => <button key={option.word.id} type="button" onClick={() => answerChoice(option.word.id)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-left text-sm leading-6 text-slate-700 hover:border-teal-300">
            {summarizeDefinition(option.word.definition_cn)}
          </button>)}
        </div>
      </div>}
      {mode === 'learn' && result && <div className="mt-6 space-y-4">
        <p className={`rounded-xl px-4 py-3 text-sm leading-6 ${result.kind === 'correct' ? 'bg-teal-50 text-teal-900' : 'bg-red-50 text-red-800'}`}>
          {result.kind === 'correct' ? '答对了！这个词已记入复习计划。' : `选错了，正确释义是「${summarizeDefinition(current.definition_cn)}」。这个词会在本轮稍后再考一次。`}
        </p>
        <p className="text-lg font-semibold leading-8">{current.definition_cn}</p>
        <div className="space-y-2 leading-7"><p>{current.example_en}</p><p className="text-slate-500">{current.example_cn}</p></div>
        {current.memory && <p className="rounded-xl bg-amber-50 p-4 leading-7">{current.memory}</p>}
        <button className="w-full rounded-xl bg-teal-700 px-5 py-3 font-medium text-white" onClick={continueAfterAnswer}>继续下一个</button>
      </div>}
      {mode === 'review' && !revealed && <button className="mt-8 w-full rounded-xl bg-teal-50 px-5 py-4 font-medium text-teal-800" onClick={() => setRevealedId(current.id)}>先回忆，再查看释义与记忆提示</button>}
      {mode === 'review' && revealed && <div className="mt-6 space-y-4">
        <p className="text-lg font-semibold leading-8">{current.definition_cn}</p>
        <div className="space-y-2 leading-7"><p>{current.example_en}</p><p className="text-slate-500">{current.example_cn}</p></div>
        {current.memory && <p className="rounded-xl bg-amber-50 p-4 leading-7">{current.memory}</p>}
        <div className="grid gap-3 pt-3 sm:grid-cols-2">
          {RATINGS.map(rating => <button key={rating.quality} type="button" onClick={() => rate(rating.quality)} className={`rounded-xl px-5 py-3 text-white ${rating.color}`}>
            <span className="block font-medium">{rating.label}</span>
            <span className="block text-xs opacity-90">{rating.hint}</span>
          </button>)}
        </div>
      </div>}
    </article> : <div className="rounded-2xl bg-teal-50 p-6 leading-8 text-teal-900">
      <h2 className="text-xl font-bold">{mode === 'review' ? '当前没有到期词汇' : '本期新词已学完'}</h2>
      <p>{mode === 'review' ? '只有实际学过的词才会加入复习计划；新词不会被自动标成已学。' : '可以切换其他日期学习，或进入到期复习重练还不熟的词。'}</p>
    </div>}
    <section className="rounded-2xl border p-5">
      <h2 className="font-bold text-slate-900">未来 7 天复习量预测</h2>
      <ul className="mt-3 space-y-2 text-slate-600">
        {forecast.map(item => <li key={item.date} className="flex items-center justify-between gap-4">
          <span>{item.date === today ? '今天' : item.date}</span>
          <span className="flex items-center gap-2">
            <span className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.min(item.count, 20) * 6}px` }} aria-hidden="true" />
            <span className="w-16 text-right">{item.count} 词</span>
          </span>
        </li>)}
      </ul>
      {due.length > 0 && <p className="mt-3 text-amber-700">今天及逾期：{due.length} 词</p>}
    </section>
  </div>
}
