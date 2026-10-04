# liuji · CET-6 六级备考系统

全栈六级备考应用：词汇（SM-2 间隔重复）、真题刷题、听力、写作 AI 批改、学习统计。

## 技术栈

- **后端** `backend/`：FastAPI + SQLAlchemy(async) + SQLite + JWT（python-jose）+ slowapi 限流
- **前端** `frontend/`：React 19 + TypeScript + Vite + Tailwind 4 + zustand + axios

## 快速开始

```bash
# 后端（端口 8765；8000 端口本机被其他项目占用）
cd backend
python3 -m venv .venv && .venv/bin/pip install -r <(python3 -c "import tomllib;print('\n'.join(tomllib.load(open('pyproject.toml','rb'))['project']['dependencies']))")
cp -n .env.example .env 2>/dev/null || true   # 需设置 SECRET_KEY
.venv/bin/python scripts/seed_vocabulary.py   # 导入 1800+ 六级词库（幂等）
.venv/bin/python scripts/seed_listening.py
.venv/bin/python scripts/seed_writing.py
.venv/bin/python scripts/seed_exams.py
.venv/bin/uvicorn app.main:app --port 8765 --reload

# 前端（端口 5173，/api 代理到后端）
cd frontend && npm install && npm run dev
```

可选：在 `backend/.env` 配置 `LLM_API_KEY`（DeepSeek 兼容接口）开启写作 AI 批改；不配置时返回 mock 批改。

## 内置数据

| 数据 | 规模 | 位置 |
|---|---|---|
| 六级词库 | 1808 词（高频 985 / 中频 720 / 低频 103） | `backend/data/cet6_vocabulary.json` |
| 真题/模拟卷 | 3 套（2024.6 真题 + 2023.12 / 2023.6 模拟卷，各含阅读 8 + 翻译 1 + 写作 1） | `backend/data/exam_papers/` |
| 听力材料 | 3 篇（transcript + 题目 + TTS 音频） | `backend/data/listening_materials.json` |
| 写作题库 | 20 篇（各带范文与写作建议） | `backend/data/writing_prompts.json` |

听力音频由 `backend/scripts/generate_listening_audio.py` 用 edge-tts（微软神经语音）生成，
落在 `backend/static/audio/`，经 FastAPI `/static` 挂载对外提供；改动 transcript 后重跑该脚本并
`seed_listening.py --reset` 即可。

## 已知待办

- [ ] 扩充真题套数与听力 section（目前卷内无听力题）
- [ ] 写作/翻译题在套卷判分中仍是字符串比对，待接入 LLM 批改
- [ ] 后端测试（tests/ 目前为空）
