"""Generate WORK/LIFE memory images for curated daily lessons.

Credentials come from the environment or the git-ignored backend/.env.local.
The API key is never written into the repository or image metadata.
"""
from __future__ import annotations

import argparse
import base64
import fcntl
import hashlib
import json
import os
import re
import time
import urllib.request
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT / '每日英语单词'
BASE_URL = 'https://us.insistgang.top'
MODEL = 'gpt-image-2.5-sunburst'


def settings() -> tuple[str, str, str]:
    values: dict[str, str] = {}
    config = Path.home() / '.config/liuji/image-api.json'
    if config.is_file():
        values.update(json.loads(config.read_text(encoding='utf-8')))
    values.update({k: v for k, v in os.environ.items() if k.startswith('LIUJI_IMAGE_')})
    key = values.get('LIUJI_IMAGE_API_KEY')
    if not key:
        raise SystemExit('缺少 LIUJI_IMAGE_API_KEY（放环境变量或 git 忽略的 backend/.env.local）')
    return values.get('LIUJI_IMAGE_BASE_URL', BASE_URL).rstrip('/'), key, values.get('LIUJI_IMAGE_MODEL', MODEL)


def lesson_words(text: str) -> tuple[list[str], list[str]]:
    groups = {'职场': [], '生活': []}
    current = ''
    for line in text.splitlines():
        if line.startswith('## '):
            name = line[3:]
            current = '职场' if '职场' in name else '生活' if '生活' in name else ''
        match = re.match(r'^(?:\*\*\d+\.\s+([^*]+)\*\*|###\s+\d+\.\s+(.+))', line) if current else None
        if match:
            groups[current].append((match[1] or match[2]).strip())
    return groups['职场'], groups['生活']


def prompt_for(work: list[str], life: list[str]) -> str:
    return (
        'Wide landscape educational memory illustration, clean flat vector art, soft teal and amber palette. '
        'Split into two equal panels side by side. Left panel has a dark blue label WORK, right panel a warm amber label LIFE. '
        'Each panel is a grid of illustrated tiles. Every vocabulary word must have its own tile, with a clear lowercase English caption below the image. '
        'Do not omit any vocabulary word or caption, do not add decorative replacement tiles, and do not merge two words into one scene. '
        'WORK tiles, in this order: ' + '; '.join(f'{word}: {VISUAL_HINTS.get(word, "illustrate its exact meaning")}' for word in work) + '. '
        'LIFE tiles, in this order: ' + '; '.join(f'{word}: {VISUAL_HINTS.get(word, "illustrate its exact meaning")}' for word in life) + '. '
        'Keep all tiles the same size and their English captions correctly aligned. '
        'The only allowed text is WORK, LIFE, and the exact lowercase vocabulary captions. No Chinese, no extra words, no watermark, no logos.'
    )


VISUAL_HINTS = {
    'offset': 'red expenses on one side balanced by an equal green income arrow on the other, visibly cancelling the costs; no scales',
    'grease': 'a person applying golden cooking oil to a frying pan with a brush, an oil bottle nearby; no bacon',
    'specify': 'a specification checklist with exact details being pointed out',
    'verify': 'a magnifying glass comparing two matching documents with a check mark',
    'exceed': 'a rising bar visibly crossing a marked limit line',
    'neglect': 'an unfinished unchecked task sitting forgotten on a desk',
    'prohibit': 'a red prohibition sign over a personal laptop storing files',
    'commence': 'a project launch ceremony beginning at a desk',
    'conform': 'identical modules fitting the same standard template',
    'constrain': 'a project compressed inside a tight box or clamp',
    'dispatch': 'a work order being sent to an engineer',
    'deduct': 'a small service fee visibly subtracted from a payment total',
    'convene': 'one person gathering colleagues around a meeting table',
    'chill': 'a cold autumn breeze and falling leaves around a person wearing a scarf; no illness',
}


def generate(path: Path, base: str, key: str, model: str, force: bool = False) -> Path | None:
    text = path.read_text(encoding='utf-8')
    if re.search(r'!\[[^]]*\]\(\.\./场景配图/[^)]+\)', text) and not force:
        print(f'已有配图，跳过：{path.name}')
        return None
    work, life = lesson_words(text)
    if len(work) != 11 or len(life) != 9:
        raise ValueError(f'{path.name}: 职场 {len(work)} 词 / 生活 {len(life)} 词，需 11+9')
    payload = json.dumps({
        'model': model, 'prompt': prompt_for(work, life), 'size': '1536x1024', 'n': 1,
    }).encode('utf-8')
    request = urllib.request.Request(base + '/v1/images/generations', data=payload,
                                     headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key})
    with urllib.request.urlopen(request, timeout=300) as response:
        result = json.load(response)
    image = base64.b64decode(result['data'][0]['b64_json'])
    if not image.startswith(b'\x89PNG'):
        raise ValueError('接口没有返回 PNG 图片')
    date = path.name[:10]
    stamp = time.strftime('%H%M%S')
    name = f'image25-sunburst-{date.replace("-", "")}-{stamp}-{hashlib.sha256(image).hexdigest()[:8]}.png'
    target = SOURCE / '场景配图' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(image)
    if force:
        text = '\n'.join(
            line for line in text.splitlines()
            if not re.match(r'^!\[[^]]*\]\(\.\./场景配图/[^)]+\)\s*$', line)
            and not line.startswith('> **场景记忆图**')
            and not (line.startswith('> **配图**') and '场景配图/' in line)
            and not (line.startswith('> **配套**') and '场景记忆图' in line)
        )
    marker = f'> **场景记忆图**：`场景配图/{name}`（{model}，WORK / LIFE 双场景）。\n\n![场景记忆图](../场景配图/{name})\n\n'
    lines = text.splitlines()
    insert_at = next((i for i, line in enumerate(lines) if line.startswith('## ')), len(lines))
    while insert_at > 0 and not lines[insert_at - 1].strip():
        insert_at -= 1
    lines[insert_at:insert_at] = marker.splitlines()
    path.write_text('\n'.join(lines).rstrip() + '\n', encoding='utf-8')
    print(f'生成成功：{path.name} -> {target} ({len(image)} bytes)')
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate memory images for daily lessons')
    parser.add_argument('--date', help='只处理该日期，格式 YYYY-MM-DD')
    parser.add_argument('--force', action='store_true', help='已有配图也重新生成')
    args = parser.parse_args()
    base, key, model = settings()
    paths = sorted((SOURCE / '历期词表').glob('*.md'))
    if args.date:
        paths = [path for path in paths if path.name.startswith(args.date)]
    if not paths:
        raise SystemExit('没有找到对应日期的词表')
    state_dir = PROJECT / '.git/daily-publish'
    state_dir.mkdir(parents=True, exist_ok=True)
    failed = 0
    with (state_dir / 'content').open('w') as content_lock:
        fcntl.flock(content_lock, fcntl.LOCK_EX)
        for path in paths:
            try:
                generate(path, base, key, model, args.force)
            except Exception as error:
                failed += 1
                print(f'失败：{path.name}: {error}')
    print(f'完成：{len(paths) - failed} 成功 / {failed} 失败')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
