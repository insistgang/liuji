import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/publish_daily_words.py'
spec = importlib.util.spec_from_file_location('daily_publish', SCRIPT)
publish = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publish)


class DailyPublishTests(unittest.TestCase):
    def test_scope_rejects_secrets_and_other_code(self):
        self.assertTrue(publish.in_scope('每日英语单词/历期词表/lesson.md'))
        self.assertTrue(publish.in_scope('frontend/public/images/daily/a.png'))
        for path in ['.env', '.workbuddy/state.json', 'frontend/src/App.tsx', '每日英语单词旧/secret']:
            self.assertFalse(publish.in_scope(path), path)

    def test_waits_for_lesson_and_image(self):
        original = publish.PROJECT
        with tempfile.TemporaryDirectory() as directory:
            publish.PROJECT = Path(directory)
            try:
                with self.assertRaises(ValueError):
                    publish.validate('2026-11-05')
                source = publish.PROJECT / '每日英语单词'
                (source / '历期词表').mkdir(parents=True)
                lesson = source / '历期词表/2026-11-05-每日英语单词20个.md'
                lesson.write_text('未完成', encoding='utf-8')
                with self.assertRaises(ValueError):
                    publish.validate('2026-11-05')
                lesson.write_text('![场景](../场景配图/a.png)', encoding='utf-8')
                with self.assertRaises(ValueError):
                    publish.validate('2026-11-05')
                (source / '场景配图').mkdir()
                (source / '场景配图/a.png').write_bytes(b'image')
                (source / '每日20词-复习窗口.md').write_text('window', encoding='utf-8')
                publish.validate('2026-11-05')
            finally:
                publish.PROJECT = original
