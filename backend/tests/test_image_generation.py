import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/generate_daily_images.py'
spec = importlib.util.spec_from_file_location('daily_images', SCRIPT)
images = importlib.util.module_from_spec(spec)
spec.loader.exec_module(images)


class DailyImageGenerationTests(unittest.TestCase):
    def test_prompt_contains_every_word_and_scene_hint(self):
        for path in sorted((images.SOURCE / '历期词表').glob('*.md')):
            work, life = images.lesson_words(path.read_text(encoding='utf-8'))
            self.assertEqual((len(work), len(life)), (11, 9), path.name)
            prompt = images.prompt_for(work, life)
            for word in work + life:
                self.assertIn(f'{word}:', prompt)
        self.assertIn('no scales', images.prompt_for(['offset'], []))
        self.assertIn('no bacon', images.prompt_for([], ['grease']))

    def test_replacing_image_removes_stale_references_and_duplicate_rules(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / '每日英语单词'
            path = source / '历期词表/2026-11-05-每日英语单词20个.md'
            path.parent.mkdir(parents=True)
            text = '# Lesson\n\n> **配套**：复习窗口 `每日20词-复习窗口.md`；场景记忆图 `../场景配图/old.png`\n'
            text += '> **配图**：旧图已经替换\n\n---\n\n\n---\n\n![scene](../场景配图/old.png)\n\n'
            for title, count in [('职场', 11), ('生活', 9)]:
                text += f'\n## {title}\n' + '\n'.join(f'**{i}. word{i}** /test/' for i in range(1, count + 1))
            path.write_text(text, encoding='utf-8')
            original = images.SOURCE
            images.SOURCE = source
            try:
                with patch.object(images, 'generate', side_effect=RuntimeError('API unavailable')):
                    with self.assertRaises(RuntimeError):
                        images.generate(path, 'https://example.invalid', 'test-key', 'test-model', force=True)
                self.assertEqual(path.read_text(encoding='utf-8'), text)
                with patch.object(images.time, 'strftime', return_value='000000'), \
                     patch.object(images.urllib.request, 'urlopen') as request:
                    response = request.return_value.__enter__.return_value
                    response.read.return_value = b'{"data": []}'
                    with self.assertRaises(IndexError):
                        images.generate(path, 'https://example.invalid', 'test-key', 'test-model', force=True)
                self.assertEqual(path.read_text(encoding='utf-8'), text)
            finally:
                images.SOURCE = original


if __name__ == '__main__':
    unittest.main()
