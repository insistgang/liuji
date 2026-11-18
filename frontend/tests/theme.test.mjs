import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  applyTheme,
  getThemeMeta,
  isDarkTheme,
  isValidTheme,
  THEMES,
  useThemeStore,
} from '../src/store/themeStore.ts'

afterEach(() => {
  delete globalThis.document
  delete globalThis.localStorage
})

test('defines six distinct themes covering light and dark modes', () => {
  assert.equal(THEMES.length, 6)
  const ids = THEMES.map((t) => t.id)
  assert.deepEqual(ids, ['light', 'sepia', 'forest', 'sakura', 'dark', 'obsidian'])
  for (const id of ids) {
    assert.equal(isValidTheme(id), true)
    assert.equal(getThemeMeta(id).id, id)
  }
  assert.equal(isValidTheme('invalid'), false)
  assert.equal(isDarkTheme('light'), false)
  assert.equal(isDarkTheme('sepia'), false)
  assert.equal(isDarkTheme('forest'), false)
  assert.equal(isDarkTheme('sakura'), false)
  assert.equal(isDarkTheme('dark'), true)
  assert.equal(isDarkTheme('obsidian'), true)
})

test('applyTheme updates data-theme, dark class, and colorScheme on root element', () => {
  const classes = new Set()
  globalThis.document = {
    documentElement: {
      dataset: {},
      style: {},
      classList: {
        toggle(name, force) {
          if (force) classes.add(name)
          else classes.delete(name)
        },
      },
    },
  }

  applyTheme('sepia')
  assert.equal(globalThis.document.documentElement.dataset.theme, 'sepia')
  assert.equal(classes.has('dark'), false)
  assert.equal(globalThis.document.documentElement.style.colorScheme, 'light')

  applyTheme('obsidian')
  assert.equal(globalThis.document.documentElement.dataset.theme, 'obsidian')
  assert.equal(classes.has('dark'), true)
  assert.equal(globalThis.document.documentElement.style.colorScheme, 'dark')
})

test('theme store remembers preferred light and dark styles across toggles', () => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  }

  useThemeStore.getState().setTheme('forest')
  assert.equal(useThemeStore.getState().theme, 'forest')

  useThemeStore.getState().setTheme('obsidian')
  assert.equal(useThemeStore.getState().theme, 'obsidian')

  useThemeStore.getState().toggle()
  assert.equal(useThemeStore.getState().theme, 'forest')

  useThemeStore.getState().toggle()
  assert.equal(useThemeStore.getState().theme, 'obsidian')
})
