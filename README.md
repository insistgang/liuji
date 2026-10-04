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
| 真题 | 1 套（2024.6 第一套，阅读+翻译+写作） | `backend/data/exam_papers/` |
| 听力材料 | 3 篇（transcript + 题目，暂无音频） | `backend/data/listening_materials.json` |
| 写作题库 | 5 篇（含范文） | `backend/data/writing_prompts.json` |

## 已知待办

- [ ] 扩充真题套数（目前仅 1 套，缺听力 section）
- [ ] 听力音频（audio_url 为空，可接 TTS 或真题音频）
- [ ] 写作/翻译题在套卷判分中仍是字符串比对，待接入 LLM 批改
- [ ] 后端测试（tests/ 目前为空）
