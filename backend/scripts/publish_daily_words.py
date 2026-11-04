"""Validate and publish locally generated daily lessons without unrelated changes."""
from __future__ import annotations

import argparse
import fcntl
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
SCOPE = ['每日英语单词', 'frontend/public/data/daily_words.json', 'frontend/public/images/daily']
PREFIX = 'chore: 发布每日英语词表 '


def git(*args: str) -> str:
    result = subprocess.run(['git', '-c', 'core.quotePath=false',
                             '-c', 'url.git@github.com:.insteadOf=https://github.com/',
                             *args], cwd=PROJECT, text=True, capture_output=True,
                            timeout=180, env={**os.environ, 'GIT_TERMINAL_PROMPT': '0',
                                             'GIT_SSH_COMMAND': 'ssh -o BatchMode=yes -o ConnectTimeout=15'})
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def validate(date: str) -> None:
    source = PROJECT / '每日英语单词'
    lesson = source / '历期词表' / f'{date}-每日英语单词20个.md'
    if not lesson.is_file():
        raise ValueError(f'等待当天词表：{lesson.name}')
    text = lesson.read_text(encoding='utf-8')
    refs = re.findall(r'!\[[^]]*\]\(\.\./场景配图/([^)]+)\)', text)
    if not refs:
        raise ValueError('当天词表尚未引用场景配图，等待生成完成')
    for name in refs:
        path = source / '场景配图' / name
        if Path(name).name != name or not path.is_file() or path.stat().st_size == 0:
            raise ValueError(f'配图缺失或路径异常：{name}')
    if not (source / '每日20词-复习窗口.md').is_file():
        raise ValueError('累计复习窗口缺失')


def in_scope(path: str) -> bool:
    return any(path == prefix or path.startswith(prefix + '/') for prefix in SCOPE)


def publish(date: str, dry_run: bool = False) -> None:
    validate(date)
    subprocess.run([sys.executable, str(PROJECT / 'backend/scripts/export_frontend_daily_words.py')],
                   cwd=PROJECT, check=True, timeout=120)
    if dry_run:
        print(f'校验通过：{date}；dry-run 不提交、不推送。')
        return
    if git('branch', '--show-current') != 'main':
        raise ValueError('当前不在 main，拒绝自动切换分支')
    if git('diff', '--cached', '--name-only'):
        raise ValueError('暂存区已有改动，拒绝混入自动提交')
    git('fetch', 'origin', 'main')
    behind = int(git('rev-list', '--count', 'HEAD..origin/main'))
    if behind:
        raise ValueError('远端有尚未合入的提交，需要人工检查；不自动覆盖本地文件')
    for sha in git('rev-list', 'origin/main..HEAD').splitlines():
        if not git('show', '-s', '--format=%s', sha).startswith(PREFIX):
            raise ValueError('有非自动词表提交尚未推送，拒绝顺带上传')
        paths = git('diff-tree', '--no-commit-id', '--name-only', '-r', sha).splitlines()
        if not all(in_scope(path) for path in paths):
            raise ValueError('待推提交包含范围外文件')
    git('add', '--', *SCOPE)
    staged = git('-c', 'core.quotePath=false', 'diff', '--cached', '--name-only').splitlines()
    if not all(in_scope(path) for path in staged):
        raise ValueError('暂存文件越界，停止发布')
    if staged:
        git('diff', '--cached', '--check')
        git('commit', '-m', PREFIX + date)
    git('push', 'origin', 'main:main')
    sha = git('rev-parse', 'HEAD')
    print(f'推送成功：{date} {sha}。GitHub Actions 将构建和发布；推送成功不等于部署成功。')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--now', action='store_true', help='忽略11点时间限制，手动发布')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--date', help='明确指定已有词表日期，用于手动校验或补发')
    args = parser.parse_args()
    now = datetime.now().astimezone()
    print(now.isoformat(timespec='seconds'), flush=True)
    if not args.now and not args.dry_run and not args.date and now.hour < 11:
        print('尚未到本机时间11点，跳过。')
        return 0
    state_dir = PROJECT / '.git/daily-publish'
    state_dir.mkdir(parents=True, exist_ok=True)
    with (state_dir / 'lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('已有发布进程，跳过。')
            return 0
        try:
            date = args.date or now.date().isoformat()
            datetime.strptime(date, '%Y-%m-%d')
            publish(date, args.dry_run)
            if not args.dry_run:
                (state_dir / 'last-success.json').write_text(json.dumps({
                    'date': date, 'pushed_at': now.isoformat(), 'sha': git('rev-parse', 'HEAD')
                }), encoding='utf-8')
            return 0
        except (ValueError, RuntimeError, subprocess.SubprocessError) as error:
            print(f'发布未完成：{error}', file=sys.stderr)
            return 1


if __name__ == '__main__':
    raise SystemExit(main())
