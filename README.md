# liuji · CET-6 六级备考系统

全栈六级备考应用：每日 20 词计划、词汇（SM-2 间隔重复）、真题刷题、听力、写作 AI 批改、学习统计。

**在线离线版**：https://insistgang.top/liuji/ （无需后端，进度保存在当前浏览器；换浏览器或清除站点数据不会自动同步）

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
| 六级词库 | 1795 个去重单词 | `backend/data/cet6_vocabulary.json` |
| 真题/模拟卷 | 3 套（2024.6 真题 + 2023.12 / 2023.6 模拟卷，各含阅读 8 + 翻译 1 + 写作 1） | `backend/data/exam_papers/` |
| 听力材料 | 3 篇（transcript + 题目 + TTS 音频） | `backend/data/listening_materials.json` |
| 写作题库 | 20 篇（各带范文与写作建议） | `backend/data/writing_prompts.json` |

听力音频由 `backend/scripts/generate_listening_audio.py` 用 edge-tts（微软神经语音）生成，
落在 `backend/static/audio/`，经 FastAPI `/static` 挂载对外提供；改动 transcript 后重跑该脚本并
`seed_listening.py --reset` 即可。

## 每日 20 词

- 首页显示今日新词目标、已学/剩余数量、到期复习和真实连续学习天数。
- 后端接口：`GET /api/v1/dashboard/daily-plan`（需要 JWT），按本机时区划分“今天”。
- 静态版同样每天提供 20 个未学新词，学习进度与连续天数写入浏览器 `localStorage`。
- 默认配置在 `backend/app/config.py`：`DAILY_NEW_WORDS=20`、`DAILY_REVIEW_LIMIT=50`。

## 静态离线版

```bash
cd frontend
VITE_STATIC_MODE=true VITE_BASE_PATH=/liuji/ npm run build
cp dist/index.html dist/404.html
```

词库由 `backend/scripts/export_frontend_vocabulary.py` 从原始 JSON 去重导出到
`frontend/public/data/vocabulary.json`。GitHub Actions 在 `main` 分支的前端或词库变更后自动构建并发布。

## 测试

```bash
cd backend
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
cd ../frontend && npm run build
```

## 已知待办

- [ ] 扩充真题套数与听力 section（目前卷内无听力题）
- [ ] 写作/翻译题在套卷判分中仍是字符串比对，待接入 LLM 批改
- [ ] 扩充后端与前端测试覆盖（当前已有每日计划与连续天数测试）
