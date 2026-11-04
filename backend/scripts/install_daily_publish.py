"""Install the current user's 11:00 launchd publishing task on macOS."""
from pathlib import Path
import os
import plistlib
import subprocess
import sys

PROJECT = Path(__file__).resolve().parents[2]
LABEL = 'com.insistgang.liuji.daily-publish'


def main():
    if sys.platform != 'darwin':
        raise SystemExit('This installer requires macOS')
    home = Path.home()
    path = home / 'Library/LaunchAgents' / f'{LABEL}.plist'
    path.parent.mkdir(parents=True, exist_ok=True)
    (home / 'Library/Logs').mkdir(parents=True, exist_ok=True)
    definition = {
        'Label': LABEL,
        'ProgramArguments': ['/usr/bin/python3', str(PROJECT / 'backend/scripts/publish_daily_words.py')],
        'WorkingDirectory': str(PROJECT),
        'EnvironmentVariables': {'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', 'PYTHONUNBUFFERED': '1'},
        'StartCalendarInterval': {'Hour': 11, 'Minute': 0},
        'StartInterval': 1800,
        'RunAtLoad': True,
        'ProcessType': 'Background',
        'StandardOutPath': str(home / 'Library/Logs/liuji-daily-publish.log'),
        'StandardErrorPath': str(home / 'Library/Logs/liuji-daily-publish.error.log'),
    }
    domain = f'gui/{os.getuid()}'
    loaded = subprocess.run(['launchctl', 'print', f'{domain}/{LABEL}'], capture_output=True).returncode == 0
    same = path.exists() and plistlib.loads(path.read_bytes()) == definition
    if loaded and same:
        print(f'Already installed: {path}')
        return
    if loaded:
        subprocess.run(['launchctl', 'bootout', f'{domain}/{LABEL}'], check=True)
    path.write_bytes(plistlib.dumps(definition))
    subprocess.run(['launchctl', 'bootstrap', domain, str(path)], check=True)
    print(f'Installed: {path}')


if __name__ == '__main__':
    main()
