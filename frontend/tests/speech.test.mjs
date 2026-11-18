import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  buildDictionaryAudioUrl,
  isDictionaryWordOrPhrase,
  isNoveltyOrNonEnglishVoice,
  normalizeSpeechText,
  pickBestEnglishVoice,
} from '../src/lib/speech.ts'

test('normalizes British/American optional letters and markdown markers', () => {
  assert.equal(normalizeSpeechText('behavio(u)r', 'us'), 'behavior')
  assert.equal(normalizeSpeechText('behavio(u)r', 'uk'), 'behaviour')
  assert.equal(normalizeSpeechText('colo(u)r', 'us'), 'color')
  assert.equal(normalizeSpeechText('colo(u)r', 'uk'), 'colour')
  assert.equal(normalizeSpeechText('**concede**', 'us'), 'concede')
  assert.equal(normalizeSpeechText('  wrap   up  ', 'us'), 'wrap up')
})

test('every word in daily_words.json and vocabulary.json qualifies for dictionary human audio', async () => {
  const daily = JSON.parse(await readFile(new URL('../public/data/daily_words.json', import.meta.url), 'utf8'))
  const vocab = JSON.parse(await readFile(new URL('../public/data/vocabulary.json', import.meta.url), 'utf8'))

  const dailyWords = daily.lessons.flatMap((lesson) => lesson.words)
  assert.ok(dailyWords.length >= 500)
  for (const item of dailyWords) {
    const us = normalizeSpeechText(item.word, 'us')
    const uk = normalizeSpeechText(item.word, 'uk')
    assert.ok(isDictionaryWordOrPhrase(us), `daily US word failed: ${item.word} -> ${us}`)
    assert.ok(isDictionaryWordOrPhrase(uk), `daily UK word failed: ${item.word} -> ${uk}`)
    assert.match(buildDictionaryAudioUrl(item.word, 'us'), /^https:\/\/dict\.youdao\.com\/dictvoice\?audio=.*&type=2$/)
    assert.match(buildDictionaryAudioUrl(item.word, 'uk'), /^https:\/\/dict\.youdao\.com\/dictvoice\?audio=.*&type=1$/)
  }

  assert.ok(vocab.length >= 1500)
  for (const item of vocab) {
    const us = normalizeSpeechText(item.word, 'us')
    const uk = normalizeSpeechText(item.word, 'uk')
    assert.ok(isDictionaryWordOrPhrase(us), `vocab US word failed: ${item.word} -> ${us}`)
    assert.ok(isDictionaryWordOrPhrase(uk), `vocab UK word failed: ${item.word} -> ${uk}`)
  }
})

test('distinguishes headwords/phrases from punctuated example sentences', () => {
  assert.equal(isDictionaryWordOrPhrase('concede'), true)
  assert.equal(isDictionaryWordOrPhrase('wrap up'), true)
  assert.equal(isDictionaryWordOrPhrase('state-of-the-art'), true)
  assert.equal(
    isDictionaryWordOrPhrase('After hours of negotiation, we finally conceded a discount.'),
    false,
  )
})

test('voice selector rejects Chinese voices and macOS novelty voices, picking Samantha/Daniel', () => {
  const macVoices = [
    { name: 'Tingting', lang: 'zh-CN', localService: true },
    { name: 'Albert', lang: 'en_US', localService: true },
    { name: 'Bad News', lang: 'en_US', localService: true },
    { name: 'Bahh', lang: 'en_US', localService: true },
    { name: 'Bells', lang: 'en_US', localService: true },
    { name: 'Boing', lang: 'en_US', localService: true },
    { name: 'Bubbles', lang: 'en_US', localService: true },
    { name: 'Cellos', lang: 'en_US', localService: true },
    { name: 'Daniel', lang: 'en_GB', localService: true },
    { name: 'Eddy (英语（美国）)', lang: 'en_US', localService: true },
    { name: 'Fred', lang: 'en_US', localService: true },
    { name: 'Samantha', lang: 'en_US', localService: true },
    { name: 'Trinoids', lang: 'en_US', localService: true },
    { name: 'Zarvox', lang: 'en_US', localService: true },
  ]

  assert.equal(isNoveltyOrNonEnglishVoice({ name: 'Tingting', lang: 'zh-CN' }), true)
  assert.equal(isNoveltyOrNonEnglishVoice({ name: 'Albert', lang: 'en_US' }), true)
  assert.equal(isNoveltyOrNonEnglishVoice({ name: 'Eddy (英语（美国）)', lang: 'en_US' }), true)
  assert.equal(isNoveltyOrNonEnglishVoice({ name: 'Samantha', lang: 'en_US' }), false)

  assert.equal(pickBestEnglishVoice(macVoices, 'us')?.name, 'Samantha')
  assert.equal(pickBestEnglishVoice(macVoices, 'uk')?.name, 'Daniel')
})
