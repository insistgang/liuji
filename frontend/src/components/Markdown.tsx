import { Fragment, type ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+?\*\*|\*[^*\n]+\*|`[^`]+`|!?\[[^\]]*\]\([^)]+\))/g
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(text.slice(last, index))
    const token = match[0]
    if (token.startsWith('**')) nodes.push(<strong key={index} className="font-semibold text-slate-900">{token.slice(2, -2)}</strong>)
    else if (token.startsWith('`')) nodes.push(<code key={index} className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-rose-700">{token.slice(1, -1)}</code>)
    else if (token.startsWith('![')) {
      const m = token.match(/!\[([^\]]*)\]\(([^)]+)\)/)
      if (m) nodes.push(<img key={index} src={asset(m[2])} alt={m[1]} className="my-3 max-w-full rounded-xl border" loading="lazy" />)
    } else if (token.startsWith('[')) {
      const m = token.match(/\[([^\]]*)\]\(([^)]+)\)/)
      if (m) nodes.push(<a key={index} href={m[2]} target="_blank" rel="noreferrer" className="text-teal-700 underline underline-offset-2">{m[1]}</a>)
    } else nodes.push(<em key={index} className="text-slate-600">{token.slice(1, -1)}</em>)
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
  return <div className="my-4 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-sm">
    <thead className="bg-slate-50"><tr>{head.map((cell, i) => <th key={i} className="px-4 py-3 text-left font-semibold text-slate-700">{inline(cell)}</th>)}</tr></thead>
    <tbody>{body.map((row, i) => <tr key={i} className="border-t border-slate-100">{row.map((cell, j) => <td key={j} className="px-4 py-3 align-top leading-6 text-slate-600">{inline(cell)}</td>)}</tr>)}</tbody>
  </table></div>
}

function blocks(source: string): ReactNode[] {
  const lines = source.split('\n')
  const out: ReactNode[] = []
  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (/^---+\s*$/.test(line)) { out.push(<hr key={key++} className="my-6 border-slate-200" />); i++; continue }
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const cls = level === 1 ? 'text-2xl font-bold text-slate-900 mt-6 mb-4'
        : level === 2 ? 'text-xl font-bold text-slate-900 mt-7 mb-3 pb-2 border-b border-slate-100'
          : 'text-base font-semibold text-teal-800 mt-5 mb-2'
      out.push(<p key={key++} className={cls}>{inline(heading[2])}</p>)
      i++; continue
    }
    if (line.trimStart().startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        const raw = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '')
        if (!/^\s*:?-+:?\s*(\|\s*:?-+:?\s*)*$/.test(raw)) rows.push(raw.split('|').map(c => c.trim()))
        i++
      }
      if (rows.length) out.push(<Table key={key++} rows={rows} />)
      continue
    }
    if (line.startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) { quote.push(lines[i].replace(/^>\s?/, '')); i++ }
      out.push(<blockquote key={key++} className="my-4 rounded-r-xl border-l-4 border-teal-200 bg-teal-50/60 px-4 py-3 text-slate-600 space-y-2">{quote.map((q, j) => <p key={j} className="leading-7">{inline(q)}</p>)}</blockquote>)
      continue
    }
    if (/^\s*<details/.test(line)) {
      const inner: string[] = []
      i++
      while (i < lines.length && !/^\s*<\/details>/.test(lines[i])) { inner.push(lines[i]); i++ }
      i++
      const summaryLine = inner.find(l => /<summary>/.test(l))
      const body = inner.filter(l => !/<\/?summary>/.test(l)).join('\n')
      out.push(<details key={key++} className="my-4 rounded-xl border border-teal-100 bg-teal-50/40 px-4 py-3">
        <summary className="cursor-pointer font-medium text-teal-800">{summaryLine ? summaryLine.replace(/<\/?summary>/g, '').trim() : '展开'}</summary>
        <div className="mt-3">{blocks(body)}</div>
      </details>)
      continue
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: string[] = []
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''))
        i++
      }
      out.push(ordered
        ? <ol key={key++} className="my-3 list-decimal space-y-2 pl-6 text-slate-700">{items.map((item, j) => <li key={j} className="leading-7">{inline(item)}</li>)}</ol>
        : <ul key={key++} className="my-3 list-disc space-y-2 pl-6 text-slate-700">{items.map((item, j) => <li key={j} className="leading-7">{inline(item)}</li>)}</ul>)
      continue
    }
    const paragraph: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\s*\||\s*[-*]\s|\s*\d+\.\s|---+$|\s*<details)/.test(lines[i])) {
      paragraph.push(lines[i]); i++
    }
    out.push(<p key={key++} className="my-3 leading-8 text-slate-700">{inline(paragraph.join(' '))}</p>)
  }
  return out
}

export default function Markdown({ source }: { source: string }) {
  return <article className="markdown-body text-[15px]">{blocks(source).map((node, i) => <Fragment key={i}>{node}</Fragment>)}</article>
}
