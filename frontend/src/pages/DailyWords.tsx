import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenText,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lightbulb,
  Maximize2,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import Markdown from '../components/Markdown'
import LearningFeedback from '../components/LearningFeedback'
import SpeakButton from '../components/vocabulary/SpeakButton'
import { plainText } from '../lib/text'
import { day, useDailyLibrary, useDailyRecords, type DailyWord, type RecordEntry } from '../store/dailyLibrary'

type TabKey = 'lesson' | 'library' | 'review' | 'source'
type StatusFilter = 'all' | 'unlearned' | 'remembered' | 'retry'

const PAGE_STEP = 40

export default function DailyWords() {
  const { library, error } = useDailyLibrary()
  const { records, storageError, save } = useDailyRecords()
  const [selected, setSelected] = useState('')
  const [tab, setTab] = useState<TabKey>('lesson')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [visibleLimit, setVisibleLimit] = useState(PAGE_STEP)
  const [zoomImage, setZoomImage] = useState<{ src: string; caption: string } | null>(null)
  const [feedback, setFeedback] = useState<{
    word: string
    remembered: boolean
    record: RecordEntry | null
    sequence: number
  } | null>(null)
  const today = day()

  useEffect(() => {
    if (!zoomImage) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomImage(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomImage])

  function answer(word: DailyWord, remembered: boolean) {
    const record = save(word, remembered)
    setFeedback((previous) => ({
      word: word.word,
      remembered,
      record,
      sequence: (previous?.sequence || 0) + 1,
    }))
  }

  if (error) {
    return (
      <div role="alert" className="app-card rounded-2xl p-8 text-center text-red-600 dark:text-red-400">
        {error}。请刷新页面重试。
      </div>
    )
  }

  if (!library) {
    return (
      <div className="space-y-5">
        <div className="app-card h-48 animate-pulse rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="app-card h-52 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const lessonIndex = Math.max(
    0,
    library.lessons.findIndex((item) =>
      selected ? item.date === selected : item.date <= today,
    ),
  )
  const lesson = library.lessons[lessonIndex] || library.lessons[0]
  const all = library.lessons.flatMap((item) =>
    item.words.map((word) => ({ ...word, date: item.date })),
  )
  const due = all.filter((word) => records[word.id] && records[word.id].due <= today)

  const activities = new Set(
    Object.values(records).flatMap((item) => [item.learned, ...item.reviewed]),
  )
  let streak = 0
  const cursor = new Date()
  if (!activities.has(day(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (activities.has(day(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const learned = lesson.words.filter((word) => records[word.id]).length
  const lessonProgressPct = Math.round((learned / Math.max(1, lesson.words.length)) * 100)

  const matchStatus = (wordId: string) => {
    const rec = records[wordId]
    if (statusFilter === 'unlearned') return !rec
    if (statusFilter === 'remembered') return !!rec && rec.interval > 0
    if (statusFilter === 'retry') return !!rec && rec.interval === 0
    return true
  }

  const query = search.trim().toLowerCase()
  const baseWords =
    tab === 'review'
      ? due
      : tab === 'library'
        ? all.filter((word) =>
            !query
              ? true
              : `${word.word} ${word.definition_cn} ${word.date} ${word.group}`
                  .toLowerCase()
                  .includes(query),
          )
        : lesson.words

  const filteredWords = tab === 'review' ? baseWords : baseWords.filter((w) => matchStatus(w.id))
  const displayedWords =
    tab === 'library' && !query ? filteredWords.slice(0, visibleLimit) : filteredWords
  const hasMoreLibraryWords = tab === 'library' && !query && displayedWords.length < filteredWords.length

  const hasOlderLesson = lessonIndex < library.lessons.length - 1
  const hasNewerLesson = lessonIndex > 0

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <header className="app-hero relative overflow-hidden rounded-3xl p-6 md:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-xs">
              <Sparkles size={13} className="app-hero-badge" aria-hidden="true" />
              <span className="app-hero-badge">每日英语单词知识库 · 共 {library.lessons.length} 期 {library.total_words} 词</span>
            </div>
            <h1 className="headword-font text-2xl font-bold tracking-tight sm:text-3xl">
              每日词表与场景复习
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/80">
              职场 11 词 + 生活 9 词双线串联，配备真人词典美/英双音朗读、词根画面抓手与双栏记忆配图。
            </p>
          </div>

          <Link
            to="/vocabulary/learn"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-md hover:bg-white/95 lg:self-auto"
          >
            <Brain size={17} aria-hidden="true" />
            进入四选一特训
          </Link>
        </div>

        {/* Stat Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <p className="text-xs text-white/70">本期已学</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold">{learned}</span>
              <span className="text-xs text-white/70">/ {lesson.words.length} 词</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${lessonProgressPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <p className="text-xs text-white/70">本期剩余</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold">{lesson.words.length - learned}</span>
              <span className="text-xs text-white/70">待掌握</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTab('review')}
            className="rounded-2xl bg-white/10 p-3.5 text-left backdrop-blur-xs hover:bg-white/15"
          >
            <p className="text-xs text-white/70">今日到期复习</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold">{due.length}</span>
              <span className="text-xs app-hero-badge">{due.length > 0 ? '点击复习 →' : '全部清零'}</span>
            </div>
          </button>

          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs">
            <p className="text-xs text-white/70">连续打卡</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Flame size={18} className="text-amber-300" aria-hidden="true" />
              <span className="text-2xl font-bold">{streak}</span>
              <span className="text-xs text-white/70">天</span>
            </div>
          </div>
        </div>
      </header>

      {storageError && (
        <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
          {storageError}
        </p>
      )}

      {/* Navigation Tabs + Lesson Date Switcher */}
      <div className="app-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="词库导航">
            {(
              [
                ['lesson', '每日 20 词', `${lesson.words.length}`],
                ['library', '全部词库', `${library.total_words}`],
                ['review', '到期复习', `${due.length}`],
                ['source', '完整学习资料', '原文'],
              ] as const
            ).map(([key, label, badge]) => {
              const active = tab === key
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(key)
                    if (key === 'library') setVisibleLimit(PAGE_STEP)
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'app-accent-solid shadow-xs'
                      : 'app-muted-pill border border-transparent'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {badge}
                  </span>
                </button>
              )
            })}
          </div>

          {(tab === 'lesson' || tab === 'source') && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!hasOlderLesson}
                onClick={() => setSelected(library.lessons[lessonIndex + 1].date)}
                aria-label="查看上一期（更早日期）"
                title="上一期（更早）"
                className="app-input inline-flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-35"
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <label htmlFor="lesson-date" className="sr-only">
                选择期次
              </label>
              <select
                id="lesson-date"
                value={lesson.date}
                onChange={(event) => setSelected(event.target.value)}
                className="app-input h-10 rounded-xl px-3.5 text-sm font-medium"
              >
                {library.lessons.map((item, idx) => (
                  <option key={item.date} value={item.date}>
                    {item.date} · 第 {library.lessons.length - idx} 期（{item.words.length} 词）
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!hasNewerLesson}
                onClick={() => setSelected(library.lessons[lessonIndex - 1].date)}
                aria-label="查看下一期（更新日期）"
                title="下一期（更新）"
                className="app-input inline-flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-35"
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Sub-toolbar: notices, search, status filters */}
        {(tab === 'lesson' || tab === 'source') && lesson.date !== today && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300">
            <span>当前展示 {lesson.date} 期词表（非今日新生成词表）；生成词表不自动计入进度，点击卡片按钮才记录学习。</span>
          </div>
        )}

        {tab === 'library' && (
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <input
              aria-label="搜索词库"
              placeholder="搜索英文单词、中文释义、职场/生活分组或日期（如 2026-11-17）…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="app-input w-full rounded-xl py-3 pl-11 pr-10 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="清空搜索"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {(tab === 'lesson' || tab === 'library') && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="掌握状态筛选">
              {(
                [
                  ['all', '全部状态'],
                  ['unlearned', '未学'],
                  ['remembered', '已记住'],
                  ['retry', '待重练'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full px-3 py-1 font-medium transition-all ${
                    statusFilter === key
                      ? 'app-accent-soft border font-semibold'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[var(--text-muted)]">
              当前显示 {displayedWords.length} / {filteredWords.length} 词 · 进度仅保存在当前浏览器
            </span>
          </div>
        )}
      </div>

      {/* Scene Memory Illustration */}
      {tab === 'lesson' && lesson.image && (
        <figure className="app-card overflow-hidden rounded-2xl">
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              setZoomImage({
                src: `${import.meta.env.BASE_URL}${lesson.image}`,
                caption: `${lesson.date} 职场（WORK）与生活（LIFE）双栏场景记忆图`,
              })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setZoomImage({
                  src: `${import.meta.env.BASE_URL}${lesson.image}`,
                  caption: `${lesson.date} 职场（WORK）与生活（LIFE）双栏场景记忆图`,
                })
              }
            }}
            className="group relative cursor-zoom-in overflow-hidden bg-black/5"
          >
            <img
              className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              src={`${import.meta.env.BASE_URL}${lesson.image}`}
              alt={`${lesson.date} 工作与生活场景记忆图`}
              loading="lazy"
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/75 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xs">
              <Maximize2 size={13} aria-hidden="true" />
              点击放大查看细节
            </span>
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-[var(--text-muted)]">
            <span>双栏场景记忆配图 · 左栏职场 11 词 / 右栏生活 9 词</span>
            <span>期次：{lesson.date}</span>
          </figcaption>
        </figure>
      )}

      {/* Empty States */}
      {tab === 'review' && !due.length && (
        <div className="app-card rounded-2xl p-8 text-center">
          <div className="app-accent-soft mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border">
            <Check size={24} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">太棒了，当前没有到期复习词！</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            先在「每日 20 词」中学习并点击「记住了」，系统会按艾宾浩斯递增周期安排复习；也可以去「全部词库」主动抽查旧词。
          </p>
        </div>
      )}

      {tab !== 'source' && !(tab === 'review' && !due.length) && displayedWords.length === 0 && (
        <div className="app-card rounded-2xl p-8 text-center text-sm text-[var(--text-muted)]">
          没有符合当前筛选条件的词汇，试试切换状态筛选或清空搜索词。
        </div>
      )}

      {/* Word Cards Grid */}
      {tab !== 'source' && displayedWords.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {displayedWords.map((word) => {
              const rec = records[word.id]
              const statusTone = !rec ? 'unlearned' : rec.interval > 0 ? 'remembered' : 'retry'
              const wordDate = word.id.split(':')[0]
              const cleanExample = plainText(word.example_en)

              return (
                <article
                  key={word.id}
                  className={`app-card-interactive flex flex-col justify-between rounded-2xl p-5 sm:p-6 ${
                    statusTone === 'remembered'
                      ? 'border-teal-500/35'
                      : statusTone === 'retry'
                        ? 'border-amber-500/45'
                        : ''
                  }`}
                >
                  <div>
                    {/* Card Top Meta */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="rounded-md bg-[var(--bg-muted)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                        #{String(word.no).padStart(2, '0')} · {word.group.replace(/（.*?）/, '')} · {wordDate.slice(5)}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 font-medium ${
                          statusTone === 'unlearned'
                            ? 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                            : statusTone === 'remembered'
                              ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {statusTone === 'unlearned'
                          ? '未学'
                          : statusTone === 'remembered'
                            ? '已记住'
                            : '待重练'}
                      </span>
                    </div>

                    {/* Headword + Pronunciation */}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="headword-font break-words text-2xl font-bold text-[var(--text-primary)]">
                          {word.word}
                        </h2>
                        <p className="phonetic-font mt-0.5 text-sm text-[var(--text-muted)]">
                          {word.phonetic}
                        </p>
                      </div>
                      <SpeakButton
                        text={word.word}
                        targetKey={`card:${word.id}`}
                        showAccentLabel
                      />
                    </div>

                    {/* Definition */}
                    {tab === 'review' ? (
                      <details className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
                        <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-[var(--accent-text)]">
                          <span>先在脑海回忆词义，再点击揭晓</span>
                          <ChevronDown size={16} className="details-chevron transition-transform" aria-hidden="true" />
                        </summary>
                        <p className="mt-2.5 border-t border-[var(--border-subtle)] pt-2.5 text-sm font-medium leading-6 text-[var(--text-primary)]">
                          {word.definition_cn}
                        </p>
                      </details>
                    ) : (
                      <p className="mt-3.5 text-[15px] font-medium leading-6 text-[var(--text-primary)]">
                        {word.definition_cn}
                      </p>
                    )}

                    {/* Example Sentence & Memory Tip */}
                    <details className="mt-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5">
                      <summary className="flex cursor-pointer items-center justify-between py-0.5 text-xs font-medium text-[var(--accent-text)]">
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpenText size={14} aria-hidden="true" />
                          例句精读与词根助记
                        </span>
                        <ChevronDown size={15} className="details-chevron transition-transform" aria-hidden="true" />
                      </summary>

                      <div className="mt-3 space-y-2.5 border-t border-[var(--border-subtle)] pt-3 text-sm">
                        <div className="flex items-start justify-between gap-2.5">
                          <p className="leading-6 text-[var(--text-primary)]">{cleanExample}</p>
                          <SpeakButton
                            text={cleanExample}
                            targetKey={`ex:${word.id}`}
                            variant="sentence"
                            label={`朗读例句：${cleanExample}`}
                          />
                        </div>
                        <p className="text-xs leading-5 text-[var(--text-secondary)]">{word.example_cn}</p>

                        {word.memory && (
                          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-6 text-[var(--text-primary)]">
                            <div className="mb-1 flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                              <Lightbulb size={13} aria-hidden="true" />
                              <span>助记与六级考点</span>
                            </div>
                            <p>{word.memory}</p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>

                  {/* Card Footer: Review Schedule & Action Buttons */}
                  <div className="mt-4 pt-2">
                    {rec && (
                      <p
                        className={`mb-3 rounded-lg px-3 py-1.5 text-xs font-medium ${
                          rec.interval > 0
                            ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-500/12 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {rec.interval > 0
                          ? `已记录 · 下次复习日 ${rec.due}（间隔 ${rec.interval} 天）`
                          : '今日待重练 · 巩固后再进入长周期复习'}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        className="app-accent-solid inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium shadow-2xs"
                        onClick={() => answer(word, true)}
                      >
                        <Check size={16} aria-hidden="true" />
                        记住了
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
                        onClick={() => answer(word, false)}
                      >
                        <RotateCcw size={15} aria-hidden="true" />
                        还不熟
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {hasMoreLibraryWords && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVisibleLimit((v) => v + 60)}
                className="app-card rounded-full px-6 py-2.5 text-sm font-medium hover:border-[var(--accent)]"
              >
                加载更多词汇（剩余 {filteredWords.length - displayedWords.length} 词）
              </button>
              <button
                type="button"
                onClick={() => setVisibleLimit(filteredWords.length)}
                className="app-muted-pill rounded-full px-5 py-2.5 text-sm font-medium"
              >
                展开全部
              </button>
            </div>
          )}
        </>
      )}

      {/* Toast Feedback */}
      {feedback && (
        <LearningFeedback
          key={feedback.sequence}
          tone={!feedback.record ? 'error' : feedback.remembered ? 'success' : 'retry'}
          message={
            !feedback.record
              ? `${feedback.word} 未保存，请检查浏览器存储权限后重试。`
              : feedback.remembered
                ? `${feedback.word} 记住了！下次复习：${feedback.record.due}。`
                : `${feedback.word} 已加入今日重练队列，听一遍发音再看例句记忆更牢。`
          }
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* Full Markdown Study Material */}
      {tab === 'source' && (
        <section className="space-y-5">
          <div className="app-card rounded-2xl p-5 sm:p-8">
            <div className="mb-4 border-b border-[var(--border-subtle)] pb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">本期完整学习讲义</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                数据源：{lesson.source} · 含助记卡、双线记忆宫殿故事、20 组易混排雷台与折叠自测题（点击词条喇叭可直接听发音）
              </p>
            </div>
            <Markdown source={lesson.markdown} />
          </div>

          <details className="app-card rounded-2xl p-5 sm:p-6">
            <summary className="flex cursor-pointer items-center justify-between font-bold text-[var(--text-primary)]">
              <span>累计复习窗口原文</span>
              <ChevronDown size={18} className="details-chevron text-[var(--text-muted)] transition-transform" aria-hidden="true" />
            </summary>
            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <Markdown source={library.review_window} />
            </div>
          </details>
        </section>
      )}

      {/* Lightbox Modal for Scene Image */}
      {zoomImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomImage.caption}
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] max-w-6xl overflow-auto rounded-2xl bg-slate-950 p-2 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              aria-label="关闭大图预览"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <img src={zoomImage.src} alt={zoomImage.caption} className="max-h-[85vh] w-auto rounded-xl object-contain" />
            <p className="py-2 text-center text-xs text-slate-300">{zoomImage.caption}</p>
          </div>
        </div>
      )}
    </div>
  )
}
