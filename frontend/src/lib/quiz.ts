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
