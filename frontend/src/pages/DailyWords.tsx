import { useEffect, useState } from 'react'
import Markdown from '../components/Markdown'

type Word = {
  id: string; no: number; word: string; phonetic: string; definition_cn: string
  example_en: string; example_cn: string; memory: string; group: string
}
type Lesson = { date: string; title: string; words: Word[]; image: string; markdown: string; source: string }
type Library = { lessons: Lesson[]; total_words: number; review_window: string }
type RecordEntry = { learned: string; reviewed: string[]; due: string; interval: number }
type Records = Record<string, RecordEntry>
const KEY = 'liuji-daily-library-progress-v1'
const day = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const readRecordsStrict = (): Records => {
  const value: unknown = JSON.parse(localStorage.getItem(KEY) || '{}')
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('学习记录格式异常')
  for (const item of Object.values(value)) {
    if (!item || typeof item.learned !== 'string' || typeof item.due !== 'string' ||
      !Array.isArray(item.reviewed) || !item.reviewed.every((date: unknown) => typeof date === 'string') ||
      !Number.isFinite(item.interval) || item.interval < 0) throw new Error('学习记录格式异常')
  }
  return value as Records
}
const readRecords = (): Records => {
  try { return readRecordsStrict() } catch { return {} }
}

export default function DailyWords() {
  const [library, setLibrary] = useState<Library | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [tab, setTab] = useState('lesson')
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<Records>(readRecords)
  const [storageError, setStorageError] = useState('')
  const today = day()
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/daily_words.json`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`词表读取失败：${res.status}`); return res.json() })
      .then((data: Library) => {
        if (!data.lessons?.length) throw new Error('知识库还没有期次')
        setLibrary(data)
        setSelected((data.lessons.find(item => item.date <= day()) || data.lessons[0]).date)
      }).catch((err: Error) => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [])

  function save(word: Word, remembered: boolean) {
    try {
      const current = readRecordsStrict()
      const old = current[word.id]
      const repeatedToday = old?.reviewed.includes(today) && old.interval > 0
      const interval = remembered ? (old ? (repeatedToday ? old.interval : Math.min(old.interval * 2 || 1, 60)) : 1) : 0
      const due = new Date()
      due.setDate(due.getDate() + interval)
      current[word.id] = { learned: old?.learned || today,
        reviewed: [...new Set([...(old?.reviewed || []), today])], due: day(due), interval }
      localStorage.setItem(KEY, JSON.stringify(current))
      setRecords(current)
      setStorageError('')
    } catch {
      setStorageError('学习记录未保存。请检查浏览器存储权限或原有记录格式；没有覆盖已有数据。')
    }
  }

  if (error) return <div role="alert" className="p-8 text-red-700">{error}。请刷新重试。</div>
  if (!library) return <div className="p-8">正在读取每日词表知识库…</div>
  const lesson = library.lessons.find(item => item.date === selected) || library.lessons[0]
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
    <p className="text-sm text-slate-500">进度仅保存在当前浏览器，不会自动跨设备同步。生成了词表不等于已经学过；只有你的实际操作才计入进度。</p>
    {storageError && <p role="alert" className="text-red-600">{storageError}</p>}
    <div className="flex flex-wrap gap-2" aria-label="词库导航">
      {[['lesson', '每日20词'], ['library', '全部词库'], ['review', '到期复习'], ['source', '完整学习资料']].map(([key, label]) =>
        <button key={key} onClick={() => setTab(key)} className={`rounded-full px-5 py-2 ${tab === key ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="lesson-date">选择期次</label>
      <select id="lesson-date" value={selected} onChange={event => setSelected(event.target.value)} className="rounded-xl border p-3 bg-white">
        {library.lessons.map(item => <option key={item.date} value={item.date}>{item.date} · {item.words.length} 词</option>)}
      </select>
      {selected !== today && <span className="text-sm text-amber-700">当前展示 {selected} 的词表，不是今天新生成的词表。</span>}
    </div>
    {tab === 'lesson' && lesson.image &&
      <figure><img className="w-full rounded-2xl border" src={`${import.meta.env.BASE_URL}${lesson.image}`} alt={`${lesson.date} 工作与生活场景记忆图`} /><figcaption className="mt-2 text-sm text-slate-500">知识库原始场景配图 · {lesson.date}</figcaption></figure>}
    {tab === 'library' && <input aria-label="搜索词库" placeholder="搜索单词、中文词义或日期" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border p-4" />}
    {tab === 'review' && !due.length && <div className="rounded-2xl bg-teal-50 p-6">没有到期记录。先在每日词表中学习并点击“记住了”，随后会安排复习。想复习旧词也可以进入“全部词库”。</div>}
    {tab !== 'source' && <div className="grid gap-4 md:grid-cols-2">{words.map(word => <article key={word.id} className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex justify-between gap-3"><h2 className="text-2xl font-bold text-slate-900">{word.word}</h2><span className="text-xs text-teal-700">{records[word.id] ? '已学' : '未学'}</span></div>
      <p className="text-slate-500 mt-1">{word.phonetic}</p>
      <p className="text-xs text-slate-400 mt-2">{word.id.split(':')[0]} · {word.group}</p>
      {tab === 'review' ? <details className="mt-4"><summary className="cursor-pointer font-medium text-teal-700">先回忆，再展开词义</summary><p className="mt-3">{word.definition_cn}</p></details> : <p className="font-medium mt-4">{word.definition_cn}</p>}
      <details className="mt-4"><summary className="cursor-pointer text-teal-700">查看例句与记忆提示</summary>
        <p className="mt-3 leading-7">{word.example_en}</p><p className="text-slate-500 leading-7">{word.example_cn}</p>
        {word.memory && <p className="mt-3 rounded-xl bg-amber-50 p-3 leading-7">{word.memory}</p>}
      </details>
      <div className="mt-5 flex gap-3"><button className="rounded-xl bg-teal-700 text-white px-4 py-2" onClick={() => save(word, true)}>记住了</button><button className="rounded-xl bg-slate-100 px-4 py-2" onClick={() => save(word, false)}>还不熟</button></div>
    </article>)}</div>}
    {tab === 'source' && <section className="space-y-5">
      <div className="rounded-2xl border p-5"><h2 className="font-bold text-xl">本期完整原文</h2><p className="text-xs text-slate-500 my-3">{lesson.source} · 含助记卡、场景故事、易混辨析、自测题与原文答案（按各期实际内容展示）。</p><Markdown source={lesson.markdown} /></div>
      <details className="rounded-2xl border p-5"><summary className="cursor-pointer font-bold">累计复习窗口原文</summary><div className="mt-4"><Markdown source={library.review_window} /></div></details>
    </section>}
  </div>
}
