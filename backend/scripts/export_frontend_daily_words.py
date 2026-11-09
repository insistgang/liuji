"""Export curated daily lessons and their source documents for the web app."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT / '每日英语单词'
PUBLIC = PROJECT / 'frontend/public'
HEADING = re.compile(r'^(?:\*\*(\d+)\.\s+([^*]+)\*\*\s*(.*)|###\s+(\d+)\.\s+(.+))$')
PHONETIC = re.compile(r'/[^/\n\s][^/\n]*/')


def parse_lesson(path: Path) -> dict:
    text = path.read_text(encoding='utf-8')
    date = path.name[:10]
    words = []
    current = None
    group = ''
    for line in text.splitlines():
        if line.startswith('## '):
            if current:
                words.append(current)
                current = None
            group = line[3:]
            if not any(label in group for label in ['职场', '生活']):
                group = ''
        match = HEADING.match(line) if group else None
        if match:
            if current:
                words.append(current)
            number = int(match[1] or match[4])
            word = (match[2] or match[5]).strip()
            tail = match[3] or ''
            current = dict(id=f'{date}:{word.lower()}', no=number, word=word,
                           phonetic=' '.join(PHONETIC.findall(tail)),
                           definition_cn=PHONETIC.sub('', tail).strip(' /'),
                           example_en='', example_cn='', memory='', group=group)
            continue
        if not current:
            continue
        clean = line.strip()
        value = clean.split('：', 1)[-1].strip()
        if clean.startswith('- **词义**'):
            current['definition_cn'] = value
        elif clean.startswith('- **音标**'):
            current['phonetic'] = value
        elif clean.startswith('- **例句**'):
            english, sep, chinese = value.partition('（')
            current['example_en'] = english.strip()
            if sep:
                current['example_cn'] = chinese.rstrip('）')
        elif clean.startswith('- **翻译**'):
            current['example_cn'] = value
        elif clean.startswith('- **记忆提示（联想）**'):
            current['memory'] = value
        elif '记忆**' in clean or '记忆提示**' in clean:
            current['memory'] = value
        elif clean.startswith('💡'):
            current['memory'] = clean.removeprefix('💡').strip()
        elif clean.startswith('>'):
            field = 'example_cn' if current['example_en'] else 'example_en'
            example = re.sub(r'^>\s*', '', clean)
            current[field] = (current[field] + ' ' + example).strip()
        elif clean.startswith('（'):
            current['example_cn'] = clean.strip('（）')
    if current:
        words.append(current)
    if len(words) != 20 or any(not w['definition_cn'] or not w['phonetic'] for w in words):
        raise ValueError(f'{path.name}: invalid lesson ({len(words)} words)')
    image = ''
    ref = re.search(r'!\[[^]]*\]\(\.\./场景配图/([^)]+)\)', text)
    if ref:
        image_source = SOURCE / '场景配图' / ref[1]
        if not image_source.is_file():
            raise FileNotFoundError(image_source)
        image = 'images/daily/' + image_source.name
        (PUBLIC / image).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(image_source, PUBLIC / image)
    return dict(date=date, title=text.splitlines()[0].lstrip('# '), words=words,
                image=image, source=path.relative_to(PROJECT).as_posix(), markdown=text,
                sha256=hashlib.sha256(text.encode()).hexdigest())


def main() -> None:
    paths = sorted((SOURCE / '历期词表').glob('*.md'))
    lessons = [parse_lesson(path) for path in paths]
    if not lessons:
        raise ValueError('No daily lessons found')
    window = (SOURCE / '每日20词-复习窗口.md').read_text(encoding='utf-8')
    payload = dict(lessons=list(reversed(lessons)), review_window=window,
                   total_words=sum(len(lesson['words']) for lesson in lessons))
    target = PUBLIC / 'data/daily_words.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    print(f'Exported {len(lessons)} lessons / {payload["total_words"]} words to {target}')


if __name__ == '__main__':
    main()
