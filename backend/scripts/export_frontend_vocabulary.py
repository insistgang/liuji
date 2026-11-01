"""Export the seeded CET-6 vocabulary as a static JSON file for the frontend.

The browser-only build has no FastAPI service. Keeping the export in a script
makes the offline word list reproducible whenever the source JSON changes.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.utils.daily_words import load_recommended_words
SOURCE = ROOT / "data" / "cet6_vocabulary.json"
TARGET = ROOT.parent / "frontend" / "public" / "data" / "vocabulary.json"


def main() -> None:
    entries = json.loads(SOURCE.read_text(encoding="utf-8"))
    recommended = load_recommended_words()
    seen: set[str] = set()
    words = []
    for entry in entries:
        word = str(entry.get("word", "")).strip()
        if not word or word in seen or word.lower() in recommended:
            continue
        seen.add(word)
        words.append(
            {
                "id": len(words) + 1,
                "word": word,
                "phonetic": entry.get("phonetic") or "",
                "part_of_speech": entry.get("part_of_speech") or entry.get("pos") or "",
                "definition_cn": entry.get("definition_cn") or entry.get("meaning") or "",
                "definition_en": entry.get("definition_en") or "",
                "example_en": entry.get("example_en") or entry.get("example") or "",
                "example_cn": entry.get("example_cn") or "",
                "frequency": entry.get("frequency") or 0,
                "tags": entry.get("tags") or "",
                "audio_url": None,
            }
        )
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(words, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Exported {len(words)} unique words to {TARGET}; skipped {len(recommended)} previously recommended words")


if __name__ == "__main__":
    main()
