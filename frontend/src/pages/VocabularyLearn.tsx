import { useState } from 'react'
import { Link } from 'react-router-dom'
import LearningFeedback from '../components/LearningFeedback'
import { day, REVIEW_INTERVALS, reviewStage, useDailyLibrary, useDailyRecords } from '../store/dailyLibrary'

export default function VocabularyLearn({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const { library, error } = useDailyLibrary()
  const { records, storageError, save } = useDailyRecords()
  const [mode, setMode] = useState(reviewOnly ? 'review' : 'learn')
  const [selected, setSelected] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'retry' | 'error'>('success')
  const [feedbackSequence, setFeedbackSequence] = useState(0)
  const today = day()

  if (error) return <div role="alert" className="p-8 text-red-700">{error}。请刷新重试。</div>
  if (!library) return <div className="p-8">正在读取你的每日词库…</div>
  const lesson = library.lessons.find(item => item.date === selected) || library.lessons.find(item => item.date <= today) || library.lessons[0]
  const all = library.lessons.flatMap(item => item.words.map(word => ({ ...word, date: item.date })))
  const due = all.filter(word => records[word.id]?.due <= today).sort((a, b) =>
    (attempts[a.id] || 0) - (attempts[b.id] || 0) || records[a.id].due.localeCompare(records[b.id].due))
  const unlearned = lesson.words.filter(word => !records[word.id])
  const queue = mode === 'review' ? due : unlearned
  const current = queue[0]
  const completedToday = all.filter(word => records[word.id]?.reviewed.includes(today) && records[word.id].interval > 0).length
  const upcoming = Object.entries(all.reduce<Record<string, number>>((result, word) => {
    const date = records[word.id]?.due
    if (date && date > today) result[date] = (result[date] || 0) + 1
    return result
  }, {})).sort(([a], [b]) => a.localeCompare(b)).slice(0, 6)

  function changeMode(next: string) {
    setMode(next)
    setRevealed(false)
    setFeedback('')
  }

  function answer(remembered: boolean) {
    if (!current || !revealed) return
    const record = save(current, remembered)
    setFeedbackTone(!record ? 'error' : remembered ? 'success' : 'retry')
    setFeedbackSequence(value => value + 1)
    if (!record) {
      setFeedback(`${current.word} 未保存，请检查浏览器存储权限后重试。`)
      return
    }
    setAttempts(value => ({ ...value, [current.id]: (value[current.id] || 0) + 1 }))
    setRevealed(false)
    setFeedback(remembered ? `${current.word} 记住了！已保存，下次复习：${record.due}。` : `${current.word} 已加入今天的重练队列，下一次答对后从 1 天间隔重新开始。`)
  }

  return <div className="mx-auto max-w-3xl space-y-6 p-2 md:p-4">
    <header className="rounded-3xl bg-slate-900 p-6 text-white md:p-8">
      <p className="text-sm text-teal-300">来自你的「每日英语单词」知识库</p>
      <h1 className="mt-3 text-3xl font-bold">词汇学习与间隔复习</h1>
      <p className="mt-4 leading-7 text-slate-300">只学习每天词表中的词汇，不另外生成或抽取通用词库。</p>
      <div className="mt-5 flex flex-wrap gap-5 text-sm"><span>本期待学 {unlearned.length}</span><span>到期复习 {due.length}</span><span>今天记住 {completedToday} 词</span></div>
    </header>
    <p className="text-sm leading-6 text-slate-500">参考遗忘规律采用递增复习间隔：{REVIEW_INTERVALS.join(' → ')} 天。首次记住后隔 1 天复习，每次到期答对进入下一档；忘记则当天重练。进度与每日词表共用，仅保存在当前浏览器。</p>
    {storageError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{storageError}</p>}
    <div className="flex flex-wrap gap-3">
      <button onClick={() => changeMode('learn')} className={`rounded-full px-5 py-2 ${mode === 'learn' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}>学习每日词汇</button>
      <button onClick={() => changeMode('review')} className={`rounded-full px-5 py-2 ${mode === 'review' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}>到期复习（{due.length}）</button>
      <Link to="/daily" className="px-3 py-2 text-teal-700 underline underline-offset-4">词表、配图与完整资料</Link>
    </div>
    {mode === 'learn' && <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="vocabulary-lesson">选择每日词表</label>
      <select id="vocabulary-lesson" value={lesson.date} onChange={event => { setSelected(event.target.value); setRevealed(false); setFeedback('') }} className="max-w-full rounded-xl border bg-white p-3">
        {library.lessons.map(item => <option key={item.date} value={item.date}>{item.date} · {item.words.length} 词</option>)}
      </select>
      {lesson.date !== today && <p className="text-sm text-amber-700">这是 {lesson.date} 的历史词表，不是今天新生成的词表。</p>}
    </div>}
    {feedback && <LearningFeedback key={feedbackSequence} message={feedback} tone={feedbackTone} onDismiss={() => setFeedback('')} />}
    {current ? <article key={current.id} className="feedback-enter rounded-3xl border bg-white p-6 shadow-sm md:p-8">
      <p className="text-sm text-slate-500">{current.id.split(':')[0]} · {current.group} · {mode === 'review' ? `本轮还剩 ${queue.length} 词` : `本期还剩 ${queue.length} 个新词`}</p>
      <h2 className="mt-5 break-words text-4xl font-bold text-slate-900">{current.word}</h2>
      <p className="mt-3 break-words text-slate-500">{current.phonetic}</p>
      {mode === 'review' && <p className="mt-3 text-sm text-amber-700">计划复习日：{records[current.id].due} · 第 {reviewStage(records[current.id])} 档</p>}
      {!revealed ? <button className="mt-8 w-full rounded-xl bg-teal-50 px-5 py-4 font-medium text-teal-800" onClick={() => setRevealed(true)}>先回忆，再查看释义与记忆提示</button> : <div className="mt-6 space-y-4">
        <p className="text-lg font-semibold leading-8">{current.definition_cn}</p>
        <div className="space-y-2 leading-7"><p>{current.example_en}</p><p className="text-slate-500">{current.example_cn}</p></div>
        {current.memory && <p className="rounded-xl bg-amber-50 p-4 leading-7">{current.memory}</p>}
        <div className="flex flex-wrap gap-3 pt-3"><button onClick={() => answer(false)} className="rounded-xl bg-slate-100 px-5 py-3">{mode === 'review' ? '忘记了，重练' : '还不熟，加入重练'}</button><button onClick={() => answer(true)} className="rounded-xl bg-teal-700 px-5 py-3 text-white">记住了，安排复习</button></div>
      </div>}
    </article> : <div className="rounded-2xl bg-teal-50 p-6 leading-8 text-teal-900">
      <h2 className="text-xl font-bold">{mode === 'review' ? '当前没有到期词汇' : '本期新词已学完'}</h2>
      <p>{mode === 'review' ? '只有实际学过的词才会加入复习计划；新词不会被自动标成已学。' : '可以切换其他日期学习，或进入到期复习重练还不熟的词。'}</p>
    </div>}
    <section className="rounded-2xl border p-5">
      <h2 className="font-bold text-slate-900">接下来的复习安排</h2>
      {due.length > 0 && <p className="mt-3 text-amber-700">今天及逾期：{due.length} 词</p>}
      {upcoming.length ? <ul className="mt-3 space-y-2 text-slate-600">{upcoming.map(([date, count]) => <li key={date} className="flex justify-between gap-4"><span>{date}</span><span>{count} 词</span></li>)}</ul> : <p className="mt-3 text-sm leading-7 text-slate-500">记住第一个词后，这里会显示下次复习日期。不会根据词表生成日期倒推虚构学习进度。</p>}
    </section>
  </div>
}
