"""Generate TTS audio for listening materials via edge-tts (Microsoft neural voices).

Reads data/listening_materials.json, synthesizes each transcript to
static/audio/listening_<id>.mp3, and writes the audio_url back into the JSON.
Re-run after editing transcripts. Requires: pip install edge-tts (dev tool only).
"""
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import edge_tts

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).parent.parent
DATA_FILE = BACKEND_ROOT / "data" / "listening_materials.json"
AUDIO_DIR = BACKEND_ROOT / "static" / "audio"
VOICES = {
    "news_report": "en-US-GuyNeural",       # 新闻播报：男声
    "long_conversation": "en-US-AriaNeural",  # 长对话：女声
    "passage": "en-US-JennyNeural",          # 篇章：女声
}
DEFAULT_VOICE = "en-US-JennyNeural"


async def generate() -> None:
    materials = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    for idx, material in enumerate(materials, start=1):
        transcript = (material.get("transcript") or "").strip()
        if not transcript:
            logger.warning("Material %d (%s) has no transcript, skipped", idx, material.get("title"))
            continue
        filename = f"listening_{idx}.mp3"
        out_path = AUDIO_DIR / filename
        voice = VOICES.get(material.get("section_type", ""), DEFAULT_VOICE)
        logger.info("Synthesizing %s with %s ...", filename, voice)
        communicate = edge_tts.Communicate(transcript, voice, rate="-10%")
        await communicate.save(str(out_path))
        material["audio_url"] = f"/static/audio/{filename}"
        logger.info("Saved %s (%d bytes)", out_path, out_path.stat().st_size)
    DATA_FILE.write_text(
        json.dumps(materials, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    logger.info("Updated audio_url in %s", DATA_FILE)


if __name__ == "__main__":
    asyncio.run(generate())
