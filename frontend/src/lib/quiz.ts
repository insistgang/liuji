import type { DailyWord } from '../store/dailyLibrary'

export type Choice = { word: DailyWord; correct: boolean }

export function hashSeed(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function summarizeDefinition(definition: string): string {
  const first = definition.split(/[；;]/)[0].trim()
  return first.length > 22 ? `${first.slice(0, 22)}…` : first
}

export function buildChoices(word: DailyWord, pool: DailyWord[], count = 3): Choice[] {
  const candidates = pool.filter(item => item.id !== word.id && item.definition_cn.trim())
  const sameGroup = candidates.filter(item => item.group === word.group)
  const otherGroup = candidates.filter(item => item.group !== word.group)
  const picked: DailyWord[] = []
  const take = (source: DailyWord[], start: number) => {
    for (let offset = 0; offset < source.length && picked.length < count; offset += 1) {
      const item = source[(start + offset) % source.length]
      if (!picked.some(entry => entry.id === item.id)) picked.push(item)
    }
  }
  const seed = hashSeed(word.id)
  take(sameGroup, seed % Math.max(sameGroup.length, 1))
  take(otherGroup, seed % Math.max(otherGroup.length, 1))
  take(candidates, seed % Math.max(candidates.length, 1))
  const choices: Choice[] = [
    { word, correct: true },
    ...picked.slice(0, count).map(item => ({ word: item, correct: false })),
  ]
  return choices.sort((left, right) => hashSeed(`${word.id}:${left.word.id}`) - hashSeed(`${word.id}:${right.word.id}`))
}

export function expandSpellingVariants(target: string): string[] {
  const cleaned = target.replace(/\*\*/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!cleaned) return []

  const results: string[] = []
  const parts = cleaned
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)

  for (const part of parts) {
    const withoutParen = part.replace(/\(([^)]+)\)/g, '').replace(/\s+/g, ' ').trim()
    const withParen = part.replace(/\(([^)]+)\)/g, '$1').replace(/\s+/g, ' ').trim()
    for (const candidate of [withoutParen, withParen, part]) {
      if (candidate && !results.includes(candidate)) {
        results.push(candidate)
      }
    }
  }

  return results
}

export function checkSpelling(input: string, target: string): boolean {
  const normalizedInput = input
    .trim()
    .replace(/^[\s"'`“”‘’.,!?;:]+|[\s"'`“”‘’.,!?;:]+$/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
  if (!normalizedInput) return false
  return expandSpellingVariants(target).includes(normalizedInput)
}

export function buildSpellingHint(word: string, revealEdges = false): string {
  const cleaned = word
    .replace(/\*\*/g, '')
    .replace(/\(([^)]+)\)/g, '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!cleaned) return ''

  const tokens = cleaned.split(' ')
  const masked = tokens
    .map((token) => {
      if (!revealEdges) {
        return Array.from(token)
          .map((ch) => (/[a-zA-Z]/.test(ch) ? '_' : ch))
          .join(' ')
      }
      if (token.length <= 1) return token
      if (token.length === 2) {
        return `${token[0]} ${/[a-zA-Z]/.test(token[1]) ? '_' : token[1]}`
      }
      const middle = Array.from(token.slice(1, -1))
        .map((ch) => (/[a-zA-Z]/.test(ch) ? '_' : ch))
        .join(' ')
      return `${token[0]} ${middle} ${token[token.length - 1]}`
    })
    .join('   ')

  return `${masked}（${tokens.map((token) => token.length).join('+')} 字母）`
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function maskWordInSentence(sentence: string, word: string): string {
  const cleanSentence = sentence
    .replace(/\*\*/g, '')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .trim()
  if (!cleanSentence) return ''

  const variants = expandSpellingVariants(word).filter((v) => !/[()]/.test(v))
  if (variants.length === 0) return cleanSentence

  const patterns: string[] = []
  for (const variant of variants) {
    const tokens = variant.split(/\s+/).filter(Boolean)
    if (tokens.length > 1) {
      const [first, ...rest] = tokens
      const firstVariants = [escapeRegex(first)]
      if (first.length >= 3) {
        firstVariants.push(`${escapeRegex(first)}(?:s|es|d|ed|ing)`)
        if (/[bcdfghjklmnpqrstvwxyz][aeiou][bdfglmnprt]$/i.test(first)) {
          firstVariants.push(`${escapeRegex(first + first[first.length - 1])}(?:ed|ing)`)
        }
        if (first.endsWith('e') && first.length >= 4) {
          firstVariants.push(`${escapeRegex(first.slice(0, -1))}(?:ed|ing)`)
        }
      }
      const restPattern = rest.map(escapeRegex).join('\\s+')
      patterns.push(`(?:${firstVariants.join('|')})\\s+${restPattern}`)
      continue
    }

    const token = tokens[0]
    if (token.length >= 4) {
      patterns.push(`${escapeRegex(token)}(?:s|es|d|ed|ing|er|est|ly)?`)
      if (/[bcdfghjklmnpqrstvwxyz][aeiou][bdfglmnprt]$/i.test(token)) {
        patterns.push(`${escapeRegex(token + token[token.length - 1])}(?:ed|ing|er)`)
      }
      if (token.endsWith('e') && token.length >= 5) {
        patterns.push(`${escapeRegex(token.slice(0, -1))}(?:ed|ing|er|ion|ive|able)`)
      }
      if (/[^aeiou]y$/i.test(token)) {
        patterns.push(`${escapeRegex(token.slice(0, -1))}i(?:es|ed|ly|ness)`)
      }
    } else {
      patterns.push(escapeRegex(token))
    }
  }

  patterns.sort((a, b) => b.length - a.length)
  const regex = new RegExp(`\\b(?:${patterns.join('|')})\\b`, 'gi')
  return cleanSentence.replace(regex, '______')
}

export function updateQueueAfterAnswer(
  queueIds: string[],
  currentId: string,
  isCorrect: boolean,
  confusedWordId?: string | null,
): string[] {
  const rest = queueIds.filter((id) => id !== currentId)
  if (isCorrect) return rest
  const next = [...rest, currentId]
  if (confusedWordId && confusedWordId !== currentId && !next.includes(confusedWordId)) {
    next.push(confusedWordId)
  }
  return next
}

export function isDesktopFinePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: fine)').matches
  )
}
