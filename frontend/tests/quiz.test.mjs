import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildChoices, hashSeed, summarizeDefinition } from '../src/lib/quiz.ts'

const pool = Array.from({ length: 30 }, (_, index) => ({
  id: `2026-11-05:word${index}`,
  no: index + 1,
  word: `word${index}`,
  phonetic: '/wɜːrd/',
  definition_cn: index % 2 === 0 ? `释义${index}；补充说明${index}` : `另一条释义${index}`,
  example_en: 'Example sentence.',
  example_cn: '例句翻译。',
  memory: '记忆提示。',
  group: index < 11 ? '职场篇（11 词）' : '生活篇（9 词）',
}))

test('choices always contain the word itself plus three distinct distractors', () => {
  for (const word of pool.slice(0, 12)) {
    const choices = buildChoices(word, pool)
    assert.equal(choices.length, 4)
    assert.equal(choices.filter(choice => choice.correct).length, 1)
    const correct = choices.find(choice => choice.correct)
    assert.equal(correct.word.id, word.id)
    const others = choices.filter(choice => !choice.correct).map(choice => choice.word.id)
    assert.equal(new Set(others).size, 3)
    assert.ok(!others.includes(word.id))
  }
})

test('choices are stable for the same word and pool', () => {
  const word = pool[3]
  assert.deepEqual(buildChoices(word, pool), buildChoices(word, pool))
  assert.deepEqual(buildChoices(word, pool).map(choice => choice.word.id), buildChoices(word, pool).map(choice => choice.word.id))
})

test('distractors prefer the same group when enough words are available', () => {
  const word = pool[0]
  const choices = buildChoices(word, pool)
  const sameGroup = choices.filter(choice => !choice.correct && choice.word.group === word.group).length
  assert.ok(sameGroup >= 2, `same group distractors: ${sameGroup}`)
})

test('small pools degrade gracefully without duplicate options', () => {
  const word = pool[0]
  const small = pool.slice(0, 3)
  const choices = buildChoices(word, small)
  assert.equal(choices.length, 3)
  assert.equal(new Set(choices.map(choice => choice.word.id)).size, 3)
})

test('every word of the published library always gets four options', async () => {
  const { readFile } = await import('node:fs/promises')
  const payload = JSON.parse(await readFile(new URL('../public/data/daily_words.json', import.meta.url), 'utf8'))
  const words = payload.lessons.flatMap(lesson => lesson.words)
  assert.ok(words.length >= 100)
  for (const word of words) {
    const choices = buildChoices(word, words)
    assert.equal(choices.length, 4, word.word)
    assert.equal(choices.filter(choice => choice.correct).length, 1, word.word)
    assert.equal(new Set(choices.map(choice => choice.word.id)).size, 4, word.word)
  }
})

test('definitions are shortened to the first clause', () => {
  assert.equal(summarizeDefinition('名词；补充说明'), '名词')
  assert.equal(summarizeDefinition('这是一个非常长的中文释义内容需要被截断处理掉才对'), '这是一个非常长的中文释义内容需要被截断处理掉…')
  assert.ok(summarizeDefinition('a'.repeat(40)).length <= 23)
})

test('hash seed is stable and unsigned', () => {
  assert.equal(hashSeed('word'), hashSeed('word'))
  assert.ok(hashSeed('word') >= 0)
  assert.notEqual(hashSeed('word'), hashSeed('other'))
})
