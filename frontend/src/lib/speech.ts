import { useSyncExternalStore } from 'react'

export type Accent = 'us' | 'uk'
export type SpeechPlaybackStatus = 'idle' | 'loading' | 'playing'

export const ACCENT_STORAGE_KEY = 'liuji-accent'
export const AUTO_SPEAK_STORAGE_KEY = 'liuji-auto-speak'

/**
 * macOS / Eloquence / novelty TTS voices that sound robotic, comedic, or garbled
 * when reading English vocabulary on macOS / iOS / browsers.
 */
const NOVELTY_VOICE_PATTERN =
  /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|wobble|eddy|flo|fred|good news|grandma|grandpa|jester|junior|kathy|organ|superstar|ralph|reed|rocko|sandy|shelley|trinoids|whisper|zarvox|espeak|compact)\b/i

const PREMIUM_VOICE_PATTERN =
  /\b(natural|neural|online|enhanced|premium|google|samantha|ava|allison|alex|zoe|evan|nicky|daniel|serena|kate|oliver|martha|arthur|aria|jenny|guy|sonia|ryan|libby|karen|moira|siri)\b/i

const US_FAVORITE_VOICES = /\b(google us english|aria|jenny|guy|samantha|ava|allison|alex|zoe)\b/i
const UK_FAVORITE_VOICES = /\b(google uk english|sonia|ryan|libby|daniel|serena|kate|oliver|martha|arthur)\b/i

export interface VoiceLike {
  name: string
  lang: string
  localService?: boolean
  default?: boolean
}

/**
 * Normalize raw word or sentence text before dictionary lookup or TTS synthesis.
 * Handles British/American optional letters like `behavio(u)r` and strips markdown.
 */
export function normalizeSpeechText(raw: string, accent: Accent = 'us'): string {
  if (!raw) return ''
  let text = raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()

  // Handle optional British spelling in parentheses: e.g. behavio(u)r -> behavior (US) / behaviour (UK)
  text = text.replace(/([a-zA-Z])\(([a-zA-Z]{1,3})\)(?=[a-zA-Z]|$)/g, (_, before: string, optional: string) =>
    accent === 'uk' ? `${before}${optional}` : before,
  )

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

/**
 * Determine whether text is a single headword or short phrase suitable for
 * studio dictionary word recordings (vs. a full example sentence).
 */
export function isDictionaryWordOrPhrase(text: string): boolean {
  const cleaned = text.trim()
  if (!cleaned || cleaned.length > 42) return false
  if (/[.!?,;:—–"()[\]{}\d]/.test(cleaned)) return false
  const parts = cleaned.split(/\s+/)
  if (parts.length > 4) return false
  return parts.every((part) => /^[a-zA-Z]+(?:[-'][a-zA-Z]+)*$/.test(part))
}

/**
 * Build HTTPS dictionary human/neural pronunciation URL (supports mainland China & global networks, US & UK).
 */
export function buildDictionaryAudioUrl(text: string, accent: Accent = 'us'): string {
  const normalized = normalizeSpeechText(text, accent)
  const type = accent === 'uk' ? 1 : 2
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(normalized)}&type=${type}`
}

export function isNoveltyOrNonEnglishVoice(voice: VoiceLike): boolean {
  const lang = (voice.lang || '').replace('_', '-')
  if (!/^en(-|$)/i.test(lang)) return true
  if (NOVELTY_VOICE_PATTERN.test(voice.name || '')) return true
  return false
}

/**
 * Rank and select the most natural English TTS voice installed on the user's device,
 * strictly avoiding Chinese system voices (Chinglish) and macOS novelty voices (e.g. Albert/Fred).
 */
export function pickBestEnglishVoice<T extends VoiceLike>(voices: readonly T[], accent: Accent = 'us'): T | null {
  const candidates = voices.filter((voice) => !isNoveltyOrNonEnglishVoice(voice))
  if (candidates.length === 0) return null

  const targetRegion = accent === 'uk' ? /^en[-_]GB\b/i : /^en[-_]US\b/i
  const secondaryRegion = accent === 'uk' ? /^en[-_](AU|IE|NZ|ZA)\b/i : /^en[-_](CA)\b/i
  const favoritePattern = accent === 'uk' ? UK_FAVORITE_VOICES : US_FAVORITE_VOICES

  let best = candidates[0]
  let bestScore = -Infinity

  for (const voice of candidates) {
    let score = 0
    const lang = voice.lang || ''
    const name = voice.name || ''

    if (targetRegion.test(lang)) score += 50
    else if (secondaryRegion.test(lang)) score += 25
    else if (/^en/i.test(lang)) score += 10

    if (PREMIUM_VOICE_PATTERN.test(name)) score += 35
    if (favoritePattern.test(name)) score += 30
    if (/natural|neural/i.test(name)) score += 20
    if (voice.localService) score += 4

    if (score > bestScore) {
      bestScore = score
      best = voice
    }
  }

  return best
}

// --- Browser Preferences & Playback Runtime ---

type Listener = () => void

function readStoredAccent(): Accent {
  try {
    const val = localStorage.getItem(ACCENT_STORAGE_KEY)
    return val === 'uk' ? 'uk' : 'us'
  } catch {
    return 'us'
  }
}

function readStoredAutoSpeak(): boolean {
  try {
    return localStorage.getItem(AUTO_SPEAK_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

let currentAccent: Accent = typeof window !== 'undefined' ? readStoredAccent() : 'us'
let currentAutoSpeak: boolean = typeof window !== 'undefined' ? readStoredAutoSpeak() : false
const prefListeners = new Set<Listener>()

function emitPrefChange() {
  for (const listener of prefListeners) listener()
}

export function getAccent(): Accent {
  return currentAccent
}

export function setAccent(accent: Accent) {
  currentAccent = accent
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent)
  } catch {
    // Ignore storage failure in private browsing
  }
  emitPrefChange()
}

export function toggleAccent(): Accent {
  const next: Accent = currentAccent === 'us' ? 'uk' : 'us'
  setAccent(next)
  return next
}

export function getAutoSpeak(): boolean {
  return currentAutoSpeak
}

export function setAutoSpeak(enabled: boolean) {
  currentAutoSpeak = enabled
  try {
    localStorage.setItem(AUTO_SPEAK_STORAGE_KEY, String(enabled))
  } catch {
    // Ignore storage failure
  }
  emitPrefChange()
}

export function useSpeechPreferences() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      prefListeners.add(listener)
      return () => prefListeners.delete(listener)
    },
    () => `${currentAccent}:${currentAutoSpeak ? '1' : '0'}`,
    () => 'us:0',
  )
  const [accent, autoFlag] = snapshot.split(':') as [Accent, string]
  return {
    accent,
    autoSpeak: autoFlag === '1',
    setAccent,
    toggleAccent,
    setAutoSpeak,
  }
}

// --- Active Playback State & Audio Pipeline ---

interface ActiveSpeechState {
  target: string
  status: SpeechPlaybackStatus
}

let activeState: ActiveSpeechState = { target: '', status: 'idle' }
const statusListeners = new Set<Listener>()

function setPlaybackState(target: string, status: SpeechPlaybackStatus) {
  if (activeState.target === target && activeState.status === status) return
  activeState = { target, status }
  for (const listener of statusListeners) listener()
}

export function useSpeechStatus(targetText: string): SpeechPlaybackStatus {
  const state = useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener)
      return () => statusListeners.delete(listener)
    },
    () => (activeState.target === targetText ? activeState.status : 'idle'),
    () => 'idle' as SpeechPlaybackStatus,
  )
  return state
}

let activeSeq = 0
let activeAudio: HTMLAudioElement | null = null
// Keep strong reference to prevent Safari/Chrome GC from collecting active utterance mid-speech
let activeUtterance: SpeechSynthesisUtterance | null = null
const failedUrls = new Set<string>()
const preloadedUrls = new Map<string, HTMLAudioElement>()

// Warm up SpeechSynthesis voices early in browser
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      window.speechSynthesis.getVoices()
    })
  } catch {
    // Ignore environments with restricted speechSynthesis
  }
}

export function stopSpeech() {
  activeSeq += 1
  if (activeAudio) {
    try {
      activeAudio.pause()
      activeAudio.currentTime = 0
    } catch {
      // Ignore pause errors
    }
    activeAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel()
      }
    } catch {
      // Ignore cancel errors
    }
  }
  activeUtterance = null
  setPlaybackState('', 'idle')
}

/**
 * Preload dictionary audio for upcoming/current word so clicking play responds instantaneously.
 */
export function preloadWordAudio(word: string, accent: Accent = currentAccent) {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  const normalized = normalizeSpeechText(word, accent)
  if (!isDictionaryWordOrPhrase(normalized)) return
  const url = buildDictionaryAudioUrl(normalized, accent)
  if (failedUrls.has(url) || preloadedUrls.has(url)) return

  try {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.setAttribute('referrerpolicy', 'no-referrer')
    audio.src = url
    if (preloadedUrls.size > 40) {
      const oldestKey = preloadedUrls.keys().next().value
      if (oldestKey) preloadedUrls.delete(oldestKey)
    }
    preloadedUrls.set(url, audio)
  } catch {
    // Ignore preload errors
  }
}

function playViaAudioElement(url: string, targetKey: string, seq: number): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return Promise.resolve(false)
  if (failedUrls.has(url)) return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(connectTimer)
      audio.onplaying = null
      audio.onended = null
      audio.onerror = null
      if (!ok) failedUrls.add(url)
      if (ok && seq === activeSeq) {
        activeAudio = null
        setPlaybackState('', 'idle')
      }
      resolve(ok)
    }

    const cached = preloadedUrls.get(url)
    const audio = cached ?? new Audio()
    if (!cached) {
      audio.preload = 'auto'
      audio.setAttribute('referrerpolicy', 'no-referrer')
      audio.src = url
    } else {
      try {
        audio.currentTime = 0
      } catch {
        // Ignore seek before metadata loaded
      }
    }

    activeAudio = audio
    const connectTimer = window.setTimeout(() => {
      try {
        audio.pause()
      } catch {
        // Ignore
      }
      finish(false)
    }, 2600)

    audio.onplaying = () => {
      window.clearTimeout(connectTimer)
      if (seq !== activeSeq) {
        audio.pause()
        finish(true)
        return
      }
      setPlaybackState(targetKey, 'playing')
    }

    audio.onended = () => {
      finish(true)
    }

    audio.onerror = () => {
      finish(false)
    }

    try {
      const playPromise = audio.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // If superseded by another click, treat as handled
          if (seq !== activeSeq) {
            finish(true)
            return
          }
          finish(false)
        })
      }
    } catch {
      finish(false)
    }
  })
}

async function getBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  const existing = window.speechSynthesis.getVoices()
  if (existing.length > 0) return existing

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let done = false
    const complete = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      window.speechSynthesis.removeEventListener?.('voiceschanged', complete)
      resolve(window.speechSynthesis.getVoices())
    }
    const timer = window.setTimeout(complete, 220)
    window.speechSynthesis.addEventListener?.('voiceschanged', complete)
  })
}

async function playViaSpeechSynthesis(text: string, accent: Accent, targetKey: string, seq: number): Promise<boolean> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return false
  }

  const synth = window.speechSynthesis
  const hadActiveSpeech = synth.speaking || synth.pending
  if (hadActiveSpeech) {
    try {
      synth.cancel()
    } catch {
      // Ignore
    }
    // Avoid Chromium/WebKit bug where synchronous cancel() + speak() drops or clips the utterance
    await new Promise((r) => window.setTimeout(r, 55))
  }

  if (seq !== activeSeq) return true

  const voices = await getBrowserVoices()
  if (seq !== activeSeq) return true

  const bestVoice = pickBestEnglishVoice(voices, accent)
  const utterance = new SpeechSynthesisUtterance(text)
  activeUtterance = utterance

  if (bestVoice) {
    utterance.voice = bestVoice
    utterance.lang = bestVoice.lang.replace('_', '-')
  } else {
    utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US'
  }
  utterance.rate = isDictionaryWordOrPhrase(text) ? 0.92 : 0.96
  utterance.pitch = 1

  return new Promise<boolean>((resolve) => {
    let settled = false
    const safetyMs = Math.max(4000, text.length * 110)
    const safetyTimer = window.setTimeout(() => done(true), safetyMs)

    const done = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(safetyTimer)
      if (activeUtterance === utterance) activeUtterance = null
      if (seq === activeSeq) setPlaybackState('', 'idle')
      resolve(ok)
    }

    utterance.onstart = () => {
      if (seq === activeSeq) setPlaybackState(targetKey, 'playing')
    }
    utterance.onend = () => done(true)
    utterance.onerror = () => done(false)

    try {
      synth.resume?.()
      setPlaybackState(targetKey, 'playing')
      synth.speak(utterance)
    } catch {
      done(false)
    }
  })
}

export interface SpeakOptions {
  accent?: Accent
  audioUrl?: string | null
  targetKey?: string
}

/**
 * Speak an English word, phrase, or example sentence with studio dictionary audio
 * and automatic fallback to curated natural English TTS voices.
 */
export async function speakText(rawText: string, options: SpeakOptions = {}): Promise<boolean> {
  const accent = options.accent ?? currentAccent
  const normalized = normalizeSpeechText(rawText, accent)
  if (!normalized) return false

  const targetKey = options.targetKey ?? rawText
  // Clicking the same button while playing toggles stop
  if (activeState.target === targetKey && activeState.status !== 'idle') {
    stopSpeech()
    return true
  }

  stopSpeech()
  const seq = activeSeq
  setPlaybackState(targetKey, 'loading')

  const online = typeof navigator === 'undefined' || navigator.onLine !== false

  // 1. Explicit audio URL if available
  if (options.audioUrl && online) {
    const ok = await playViaAudioElement(options.audioUrl, targetKey, seq)
    if (ok || seq !== activeSeq) return ok
  }

  // 2. Real human/neural dictionary audio for words & short phrases
  if (online && isDictionaryWordOrPhrase(normalized)) {
    const dictUrl = buildDictionaryAudioUrl(normalized, accent)
    const ok = await playViaAudioElement(dictUrl, targetKey, seq)
    if (ok || seq !== activeSeq) return ok
  }

  // 3. Curated English Web Speech API voice (offline fallback & full example sentences)
  const ttsOk = await playViaSpeechSynthesis(normalized, accent, targetKey, seq)
  if (!ttsOk && seq === activeSeq) {
    setPlaybackState('', 'idle')
  }
  return ttsOk
}
