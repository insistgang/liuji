"""Read the cumulative daily-word index shared by the API and the static export."""

from __future__ import annotations

from pathlib import Path

HISTORY_FILE = (
    Path(__file__).resolve().parents[3]
    / "每日英语单词"
    / "每日20词-复习窗口.md"
)


def load_recommended_words() -> set[str]:
    """Return lowercase words already recommended by the daily-word project."""
    if not HISTORY_FILE.is_file():
        return set()
    text = HISTORY_FILE.read_text(encoding="utf-8")
    if "## 总索引" not in text:
        return set()
    index = text.split("## 总索引", 1)[1].split("\n## ", 1)[0]
    words: set[str] = set()
    for line in index.splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 4:
            continue
        word = cells[0].lower()
        if word == "单词":
            continue
        if word.replace(" ", "").replace("-", "").isalpha():
            words.add(word)
    return words
