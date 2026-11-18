import { Fragment, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import SpeakButton from './vocabulary/SpeakButton'

function inline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+?\*\*|\*[^*\n]+\*|`[^`]+`|!?\[[^\]]*\]\([^)]+\))/g
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(text.slice(last, index))
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={index} className="font-semibold text-[var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>,
      )
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={index}
          className="rounded-md bg-[var(--bg-muted)] px-1.5 py-0.5 text-[13px] font-medium text-[var(--accent-text)]"
        >
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('![')) {
      const m = token.match(/!\[([^\]]*)\]\(([^)]+)\)/)
      if (m) {
        nodes.push(
          <img
            key={index}
            src={asset(m[2])}
            alt={m[1]}
            className="my-4 max-w-full rounded-2xl border border-[var(--border-subtle)] shadow-xs"
            loading="lazy"
          />,
        )
      }
    } else if (token.startsWith('[')) {
      const m = token.match(/\[([^\]]*)\]\(([^)]+)\)/)
      if (m) {
        nodes.push(
          <a
            key={index}
            href={m[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--accent-text)] underline underline-offset-3 [overflow-wrap:anywhere]"
          >
            {m[1]}
          </a>,
        )
      }
    } else {
      nodes.push(
        <em key={index} className="italic text-[var(--text-secondary)]">
          {token.slice(1, -1)}
        </em>,
      )
    }
    last = index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function asset(src: string) {
  if (src.startsWith('../场景配图/')) return `${import.meta.env.BASE_URL}images/daily/${src.split('/').pop()}`
  if (src.startsWith('/Users/')) return `${import.meta.env.BASE_URL}images/daily/${src.split('/').pop()}`
  return src
}

function Table({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--bg-muted)]">
          <tr>
            {head.map((cell, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold text-[var(--text-primary)]">
                {inline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="border-t border-[var(--border-subtle)] even:bg-[var(--bg-subtle)]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top leading-6 text-[var(--text-secondary)]">
                  {inline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const WORD_ENTRY_LINE = /^\*\*(\d+)\.\s+([^*]+)\*\*\s*(.*)$/

function blocks(source: string): ReactNode[] {
  const lines = source.split('\n')
  const out: ReactNode[] = []
  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (/^---+\s*$/.test(line)) {
      out.push(<hr key={key++} className="my-6 border-[var(--border-subtle)]" />)
      i++
      continue
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const text = heading[2]
      const h3Word = level === 3 ? text.match(/^(\d+)\.\s+([A-Za-z][A-Za-z\s'-]*?)(?:\s+(\/.*))?$/) : null
      const cls =
        level === 1
          ? 'headword-font break-words text-2xl font-bold text-[var(--text-primary)] mt-6 mb-4'
          : level === 2
            ? 'break-words text-lg font-bold text-[var(--text-primary)] mt-8 mb-3 pb-2 border-b border-[var(--border-subtle)]'
            : 'break-words text-base font-semibold text-[var(--accent-text)] mt-5 mb-2 flex flex-wrap items-center gap-2'
      out.push(
        <div key={key++} className={cls}>
          <span>{inline(text)}</span>
          {h3Word && <SpeakButton text={h3Word[2].trim()} variant="inline" showAccentLabel />}
        </div>,
      )
      i++
      continue
    }
    if (line.trimStart().startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        const raw = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '')
        if (!/^\s*:?-+:?\s*(\|\s*:?-+:?\s*)*$/.test(raw)) rows.push(raw.split('|').map((c) => c.trim()))
        i++
      }
      if (rows.length) out.push(<Table key={key++} rows={rows} />)
      continue
    }
    if (line.startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(
        <blockquote
          key={key++}
          className="my-4 space-y-2 rounded-r-xl border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]"
        >
          {quote.map((q, j) => (
            <p key={j} className="break-words leading-7">
              {inline(q)}
            </p>
          ))}
        </blockquote>,
      )
      continue
    }
    if (/^\s*<details/.test(line)) {
      const inner: string[] = []
      i++
      while (i < lines.length && !/^\s*<\/details>/.test(lines[i])) {
        inner.push(lines[i])
        i++
      }
      i++
      const summaryLine = inner.find((l) => /<summary>/.test(l))
      const body = inner.filter((l) => !/<\/?summary>/.test(l)).join('\n')
      out.push(
        <details
          key={key++}
          className="my-4 rounded-xl border border-[var(--accent-soft-border)] bg-[var(--accent-soft)] px-4 py-3"
        >
          <summary className="flex cursor-pointer items-center justify-between font-medium text-[var(--accent-text)]">
            <span>{summaryLine ? summaryLine.replace(/<\/?summary>/g, '').trim() : '展开查看答案'}</span>
            <ChevronDown size={16} className="details-chevron transition-transform" aria-hidden="true" />
          </summary>
          <div className="mt-3 border-t border-[var(--accent-soft-border)] pt-3">{blocks(body)}</div>
        </details>,
      )
      continue
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: string[] = []
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''))
        i++
      }
      out.push(
        ordered ? (
          <ol key={key++} className="my-3 list-decimal space-y-2 pl-5 sm:pl-6 text-[var(--text-secondary)]">
            {items.map((item, j) => (
              <li key={j} className="break-words leading-7">
                {inline(item)}
              </li>
            ))}
          </ol>
        ) : (
          <ul key={key++} className="my-3 list-disc space-y-1.5 pl-5 sm:pl-6 text-[var(--text-secondary)]">
            {items.map((item, j) => (
              <li key={j} className="break-words leading-7">
                {inline(item)}
              </li>
            ))}
          </ul>
        ),
      )
      continue
    }

    // Special rendering for numbered word entry lines: e.g. **1. concede** /kənˈsiːd/
    const wordEntry = line.trim().match(WORD_ENTRY_LINE)
    if (wordEntry && /^[a-zA-Z]/.test(wordEntry[2].trim())) {
      const [, num, wordText, rest] = wordEntry
      out.push(
        <div
          key={key++}
          className="mt-5 mb-2 flex flex-wrap items-center gap-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-3.5 py-2.5"
        >
          <span className="rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
            #{num.padStart(2, '0')}
          </span>
          <strong className="headword-font text-lg font-bold text-[var(--text-primary)]">{wordText.trim()}</strong>
          {rest && <span className="phonetic-font text-sm text-[var(--text-muted)]">{inline(rest)}</span>}
          <SpeakButton text={wordText.trim()} targetKey={`md:${num}:${wordText.trim()}`} variant="inline" showAccentLabel />
        </div>,
      )
      i++
      continue
    }

    const paragraph: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|>|\s*\||\s*[-*]\s|\s*\d+\.\s|---+$|\s*<details|\*\*\d+\.\s)/.test(lines[i])
    ) {
      paragraph.push(lines[i])
      i++
    }
    out.push(
      <p key={key++} className="my-3 break-words leading-8 text-[var(--text-secondary)]">
        {inline(paragraph.join(' '))}
      </p>,
    )
  }
  return out
}

export default function Markdown({ source }: { source: string }) {
  return (
    <article className="markdown-body min-w-0 break-words [overflow-wrap:anywhere] text-[15px]">
      {blocks(source).map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </article>
  )
}
