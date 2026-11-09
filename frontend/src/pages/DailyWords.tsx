import { useState } from 'react'
import Markdown from '../components/Markdown'
import LearningFeedback from '../components/LearningFeedback'
import { Check, RotateCcw } from 'lucide-react'
import { day, useDailyLibrary, useDailyRecords, type RecordEntry } from '../store/dailyLibrary'

export default function DailyWords() {
  const { library, error } = useDailyLibrary()
  const { records, storageError, save } = useDailyRecords()
  const [selected, setSelected] = useState('')
  const [tab, setTab] = useState('lesson')
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<{ word: string; remembered: boolean; record: RecordEntry | null; sequence: number } | null>(null)
  const today = day()

  function answer(word: Parameters<typeof save>[0], remembered: boolean) {
    const record = save(word, remembered)
    setFeedback(previous => ({ word: word.word, remembered, record, sequence: (previous?.sequence || 0) + 1 }))
  }

  if (error) return <div role="alert" className="p-8 text-red-700 dark:text-red-300">{error}。请刷新重试。</div>
  if (!library) return <div className="p-8">正在读取每日词表知识库…</div>
  const lesson = library.lessons.find(item => item.date === selected) || library.lessons.find(item => item.date <= today) || library.lessons[0]
  const all = library.lessons.flatMap(item => item.words.map(word => ({ ...word, date: item.date })))
  const due = all.filter(word => records[word.id] && records[word.id].due <= today)
  const activities = new Set(Object.values(records).flatMap(item => [item.learned, ...item.reviewed]))
  let streak = 0
  const cursor = new Date()
  if (!activities.has(day(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (activities.has(day(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  const learned = lesson.words.filter(word => records[word.id]).length
  const filtered = all.filter(word => `${word.word} ${word.definition_cn} ${word.date}`.toLowerCase().includes(search.toLowerCase()))
  const words = tab === 'review' ? due : tab === 'library' ? filtered : lesson.words

  return <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-6">
    <header className="rounded-3xl bg-slate-900 text-white p-6 md:p-10">
      <p className="text-teal-300 text-sm">我的六级词库 · 来自「每日英语单词」</p>
      <h1 className="text-3xl font-bold mt-3">每日词表与复习</h1>
      <p className="mt-4 text-slate-300">{library.lessons.length} 期 · {library.total_words} 词 · 原始例句、记忆提示和场景图</p>
      <div className="mt-6 flex flex-wrap gap-6 text-sm">
        <span>本期已学 <strong>{learned}/{lesson.words.length}</strong></span>
        <span>本期剩余 <strong>{lesson.words.length - learned}</strong></span>
        <span>到期复习 <strong>{due.length}</strong></span>
        <span>连续学习 <strong>{streak} 天</strong></span>
      </div>
    </header>
    <p className="text-sm text-slate-500 dark:text-slate-400">进度仅保存在当前浏览器，不会自动跨设备同步。生成了词表不等于已经学过；只有你的实际操作才计入进度。</p>
    {storageError && <p role="alert" className="text-red-600 dark:text-red-400">{storageError}</p>}
    <div className="flex flex-wrap gap-2" aria-label="词库导航">
      {[['lesson', '每日20词'], ['library', '全部词库'], ['review', '到期复习'], ['source', '完整学习资料']].map(([key, label]) =>
        <button key={key} onClick={() => setTab(key)} className={`rounded-full px-5 py-2 ${tab === key ? 'bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>{label}</button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="lesson-date">选择期次</label>
      <select id="lesson-date" value={lesson.date} onChange={event => setSelected(event.target.value)} className="rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 p-3 dark:text-slate-100">
        {library.lessons.map(item => <option key={item.date} value={item.date}>{item.date} · {item.words.length} 词</option>)}
      </select>
      {lesson.date !== today && <span className="text-sm text-amber-700 dark:text-amber-300">当前展示 {lesson.date} 的词表，不是今天新生成的词表。</span>}
    </div>
    {tab === 'lesson' && lesson.image &&
      <figure><img className="w-full rounded-2xl border dark:border-slate-800" src={`${import.meta.env.BASE_URL}${lesson.image}`} alt={`${lesson.date} 工作与生活场景记忆图`} /><figcaption className="mt-2 text-sm text-slate-500 dark:text-slate-400">知识库原始场景配图 · {lesson.date}</figcaption></figure>}
    {tab === 'library' && <input aria-label="搜索词库" placeholder="搜索单词、中文词义或日期" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 p-4 dark:text-slate-100 dark:placeholder:text-slate-500" />}
    {tab === 'review' && !due.length && <div className="rounded-2xl bg-teal-50 dark:bg-teal-950 p-6">没有到期记录。先在每日词表中学习并点击“记住了”，随后会安排复习。想复习旧词也可以进入“全部词库”。</div>}
    {tab !== 'source' && <div className="grid gap-4 md:grid-cols-2">{words.map(word => <article key={word.id} className={`rounded-2xl border p-6 shadow-sm transition-colors ${!records[word.id] ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900' : records[word.id].interval > 0 ? 'border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/40' : 'border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/40'}`}>
      <div className="flex justify-between gap-3"><h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{word.word}</h2><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${!records[word.id] ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : records[word.id].interval > 0 ? 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200' : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'}`}>{!records[word.id] ? '未学' : records[word.id].interval > 0 ? '已记住' : '待重练'}</span></div>
      <p className="text-slate-500 dark:text-slate-400 mt-1">{word.phonetic}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{word.id.split(':')[0]} · {word.group}</p>
      {tab === 'review' ? <details className="mt-4"><summary className="cursor-pointer font-medium text-teal-700 dark:text-teal-300">先回忆，再展开词义</summary><p className="mt-3">{word.definition_cn}</p></details> : <p className="font-medium mt-4">{word.definition_cn}</p>}
      <details className="mt-4"><summary className="cursor-pointer text-teal-700 dark:text-teal-300">查看例句与记忆提示</summary>
        <p className="mt-3 leading-7">{word.example_en}</p><p className="text-slate-500 dark:text-slate-400 leading-7">{word.example_cn}</p>
        {word.memory && <p className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950 p-3 leading-7">{word.memory}</p>}
      </details>
      {records[word.id] && <p className={`mt-4 rounded-xl px-3 py-2 text-sm ${records[word.id].interval > 0 ? 'bg-teal-100/60 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200' : 'bg-amber-100/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'}`}>{records[word.id].interval > 0 ? `已保存 · 下次复习 ${records[word.id].due}` : '已保存 · 今天还需要重练，不会延后复习'}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 text-white px-4 py-2" onClick={() => answer(word, true)}><Check size={17} aria-hidden="true" />记住了</button><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 px-4 py-2" onClick={() => answer(word, false)}><RotateCcw size={16} aria-hidden="true" />还不熟</button></div>
    </article>)}</div>}
    {feedback && <LearningFeedback key={feedback.sequence} tone={!feedback.record ? 'error' : feedback.remembered ? 'success' : 'retry'} message={!feedback.record ? `${feedback.word} 未保存，请检查浏览器存储权限后重试。` : feedback.remembered ? `${feedback.word} 记住了！已保存，下次复习：${feedback.record.due}。` : `${feedback.word} 已加入今天的重练队列，再看一次例句和记忆提示吧。`} onDismiss={() => setFeedback(null)} />}
    {tab === 'source' && <section className="space-y-5">
      <div className="rounded-2xl border dark:border-slate-800 p-5"><h2 className="font-bold text-xl">本期完整原文</h2><p className="text-xs text-slate-500 dark:text-slate-400 my-3">{lesson.source} · 含助记卡、场景故事、易混辨析、自测题与原文答案（按各期实际内容展示）。</p><Markdown source={lesson.markdown} /></div>
      <details className="rounded-2xl border dark:border-slate-800 p-5"><summary className="cursor-pointer font-bold">累计复习窗口原文</summary><div className="mt-4"><Markdown source={library.review_window} /></div></details>
    </section>}
  </div>
}
