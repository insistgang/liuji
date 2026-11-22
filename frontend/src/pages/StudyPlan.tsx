import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { day } from '../store/dailyLibrary'
import { speakText, stopSpeech, useSpeechStatus } from '../lib/speech'
import { isPractice, MAX_NOTE_LENGTH, practiceOptions, readStudyLog, resultLabel, saveStudyEntry, type Practice, type StudyResult } from '../lib/studyPlan'

const listeningText = 'Good morning. The library workshop was originally scheduled for Thursday evening. Because the main hall will be closed for repairs, the workshop will now take place on Friday at six in Room 204. Please keep your original registration. You do not need to sign up again.'

const drills = {
  reading: {
    source: 'When a university replaced some lectures with short videos, students appreciated the flexibility. However, completion rates fell for students who watched the videos without a weekly schedule. The department kept the videos but added one fixed discussion session each week.',
    task: '用一句话说出：院系为何加回固定讨论课？找出文中支持这个决定的一句。',
    check: '没有每周安排的学生，课程完成率下降。证据是第二句；院系保留了视频，并未放弃线上材料。',
  },
  listening: {
    source: listeningText,
    task: '不看原文先听一遍：活动改到哪一天、几点、哪里？已报名的人还要再报名吗？',
    check: '周五 6 点，204 室；不用重新报名。注意 Thursday 是原安排，Friday 才是调整后的时间。',
  },
  writing: {
    source: 'Should universities set aside quiet spaces where students cannot use their phones?',
    task: '列一个三段式提纲，再写一个主体段：用具体例子说明你的理由。不需要写完整作文。',
    check: '自查：首段有明确立场；主体段有主题句、实例和解释；结尾回应观点，不突然引入新理由。',
  },
  translation: {
    source: '为了让更多居民在下班后借书，社区图书馆延长了开放时间。工作人员也增设了预约取书点，让读者无需排长队。',
    task: '先独立翻译两句，再对照参考译文，找出一个漏掉的信息点或可以改进的表达。',
    check: 'To make it easier for more residents to borrow books after work, the community library extended its opening hours. Staff also added pickup points for reserved books so that readers would not have to wait in long lines.',
  },
} satisfies Record<Practice, { source: string; task: string; check: string }>

const buttonStyle = 'inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-85'

function ListeningPlayback() {
  const targetKey = 'study-plan:listening'
  const status = useSpeechStatus(targetKey)
  const [error, setError] = useState(false)
  useEffect(() => () => { stopSpeech() }, [])

  return (
    <div>
      <button type="button" className={`app-accent-soft ${buttonStyle}`} onClick={async () => {
        setError(false)
        setError(!await speakText(listeningText, { targetKey }))
      }}>
        {status === 'idle' ? '播放听力' : '停止播放'}
      </button>
      {error && <p role="status" className="mt-2 text-sm text-[var(--text-secondary)]">暂时无法朗读。可展开原文，或先选另一项练习。</p>}
    </div>
  )
}

function readLocalLog() {
  try { return { entries: readStudyLog(window.localStorage), error: '' } }
  catch { return { entries: {}, error: '无法读取小结。可以继续练习，已有记录不会被覆盖。' } }
}

const dateFormat = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' })

export default function StudyPlan() {
  const [params] = useSearchParams()
  const requested = params.get('practice')
  const practice = isPractice(requested) ? requested : 'reading'
  const drill = drills[practice]
  const [log, setLog] = useState(readLocalLog)
  const today = day()
  const [note, setNote] = useState(() => log.entries[today]?.note ?? '')
  const [feedback, setFeedback] = useState('')
  const recent = Object.entries(log.entries).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7)

  function save(result: StudyResult) {
    try {
      setLog({ entries: saveStudyEntry(window.localStorage, day(), { result, note }), error: '' })
      setFeedback(`已保存：${resultLabel(result)}。`)
    } catch {
      setFeedback('未能保存。请检查浏览器存储权限或记录格式；已有数据未被覆盖。')
    }
  }

  return (
    <div className="space-y-5">
      <header className="app-hero rounded-3xl p-5 sm:p-7 md:p-9">
        <p className="text-sm font-medium text-white/80">5 分钟复习 · 20 分钟专项</p>
        <h1 className="headword-font mt-2 text-2xl font-bold sm:text-3xl">六级学习计划</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">每次只做一个专项。今天精力不足，做完词汇复习就可以停；没做完的任务不叠加到明天。</p>
      </header>

      <section aria-labelledby="plan-review" className="app-card rounded-2xl p-4 sm:p-6">
        <h2 id="plan-review" className="text-lg font-semibold">1. 先复习 · 5 分钟</h2>
        <p className="my-3 text-sm leading-6 text-[var(--text-secondary)]">从到期词里挑 1–3 个，先回忆词义或说一个例句，再核对。没有到期词，就用最新词表。</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/daily?tab=review" className={`app-accent-solid ${buttonStyle}`}>打开到期复习</Link>
          <Link to="/daily" className={`app-accent-soft ${buttonStyle}`}>查看最新词表</Link>
        </div>
      </section>

      <section aria-labelledby="plan-practice" className="app-card rounded-2xl p-4 sm:p-6">
        <h2 id="plan-practice" className="text-lg font-semibold">2. 选一个专项 · 20 分钟</h2>
        <p className="my-3 text-sm text-[var(--text-secondary)]">以下是站内原创短练习，不是历年真题。先作答，再展开参考。</p>
        <nav aria-label="选择专项" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {practiceOptions.map(({ id, label }) => (
            <Link key={id} to={`?practice=${id}`} preventScrollReset aria-current={practice === id ? 'true' : undefined}
              className={`${practice === id ? 'app-accent-solid' : 'app-accent-soft'} ${buttonStyle}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div key={practice} className="space-y-3 rounded-xl bg-[var(--bg-subtle)] p-4 text-sm leading-6">
          <h3 className="font-semibold">{resultLabel(practice)}短练习</h3>
          {practice !== 'listening' && <p lang={practice === 'translation' ? 'zh-CN' : 'en'}>{drill.source}</p>}
          <p>{drill.task}</p>
          {practice === 'listening' && <ListeningPlayback />}
          <details>
            <summary className="cursor-pointer py-2 font-semibold text-[var(--accent-text)]">{practice === 'listening' ? '查看参考与听力原文' : '查看参考'}</summary>
            <p lang={practice === 'translation' ? 'en' : 'zh-CN'}>{drill.check}</p>
            {practice === 'listening' && <p lang="en" className="mt-2">{drill.source}</p>}
          </details>
        </div>
      </section>

      <section aria-labelledby="plan-log" className="app-card rounded-2xl p-4 sm:p-6">
        <h2 id="plan-log" className="text-lg font-semibold">3. 做完记一行</h2>
        <p className="my-3 text-sm leading-6 text-[var(--text-secondary)]">按实际完成情况保存。同一天再次保存会更新当天小结。记录只存在当前浏览器，不包含在词汇备份里。</p>
        {log.error && <p role="alert" className="mb-3 text-sm">{log.error}</p>}
        <label htmlFor="study-note" className="mb-1 block text-sm font-medium">结果或错因（选填）</label>
        <textarea id="study-note" name="study-note" autoComplete="off" rows={2} maxLength={MAX_NOTE_LENGTH}
          className="app-input block w-full rounded-xl p-3 text-sm" placeholder="例如：阅读答对 1 题，漏看转折…"
          value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={`app-accent-solid ${buttonStyle}`} type="button" onClick={() => save(practice)}>记录{resultLabel(practice)}</button>
          <button className={`app-accent-soft ${buttonStyle}`} type="button" onClick={() => save('review-only')}>记录仅复习</button>
        </div>
        <p role="status" className="mt-2 text-sm text-[var(--text-secondary)]">{feedback}</p>
        <h3 className="mt-4 text-sm font-semibold">最近记录</h3>
        {recent.length ? (
          <ul className="mt-1 divide-y divide-[var(--border-subtle)] text-sm">
            {recent.map(([date, entry]) => (
              <li key={date} className="flex flex-wrap items-baseline gap-x-3 py-2">
                <time className="tabular-nums" dateTime={date}>{dateFormat.format(new Date(`${date}T12:00:00`))}</time>
                <span className="font-medium">{resultLabel(entry.result)}</span>
                {entry.note && <span className="min-w-0 break-words text-[var(--text-secondary)]">{entry.note}</span>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-sm text-[var(--text-muted)]">还没有保存的小结。</p>}
      </section>
    </div>
  )
}
