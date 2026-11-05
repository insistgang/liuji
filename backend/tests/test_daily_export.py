import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/export_frontend_daily_words.py'
spec = importlib.util.spec_from_file_location('daily_export', SCRIPT)
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class DailyExportTests(unittest.TestCase):
    def test_every_source_lesson_keeps_twenty_complete_words_and_source(self):
        paths = sorted((export.SOURCE / '历期词表').glob('*.md'))
        self.assertTrue(paths)
        with tempfile.TemporaryDirectory() as directory:
            original = export.PUBLIC
            export.PUBLIC = Path(directory)
            try:
                for path in paths:
                    lesson = export.parse_lesson(path)
                    self.assertEqual(len(lesson['words']), 20, path.name)
                    self.assertEqual(lesson['markdown'], path.read_text(encoding='utf-8'))
                    self.assertEqual(len({w['id'] for w in lesson['words']}), 20)
                    for word in lesson['words']:
                        self.assertGreater(len(word['word']), 1)
                        self.assertTrue(word['example_en'], word['word'])
                        self.assertTrue(word['example_cn'], word['word'])
                        self.assertNotIn(word['example_en'].lower(), word['word'].lower())
                        self.assertTrue(word['definition_cn'], word['word'])
                    if lesson['image']:
                        self.assertTrue((export.PUBLIC / lesson['image']).is_file())
            finally:
                export.PUBLIC = original

    def test_variant_phonetics_do_not_treat_separator_as_transcription(self):
        self.assertEqual(export.PHONETIC.findall('/foo/（名词）/ /bar/（动词）'), ['/foo/', '/bar/'])

    def test_invalid_source_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '2026-11-05-每日英语单词20个.md'
            path.write_text('# 空词表\n', encoding='utf-8')
            with self.assertRaises(ValueError):
                export.parse_lesson(path)
