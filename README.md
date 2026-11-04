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

- 静态首页 `/daily` 直接读取 `每日英语单词/历期词表/` 的真实期次，不再用通用题库替代每日词表。
- 支持按日期查看每期 20 词、原始音标、词义、例句、记忆提示及场景配图；全部词库可按英文、中文或日期搜索。
- “完整学习资料”保留本期 Markdown 原文（含各期实际的故事、易混辨析、自测题与答案），以及累计复习窗口原文。
- 无当天文件时展示最近已有期次并明确标注日期，不生成或冒充当天词表。
- 学习记录采用独立的 `liuji-daily-library-progress-v1` 浏览器存储，不覆盖旧题库进度。只有手动点击才记录学习，按本地日期统计连续天数；“还不熟”保持到期，“记住了”安排后续复习。
- 进度不自动跨设备同步，提醒任务也不能仅通过服务器读取浏览器中的真实完成数量。
- 旧题库保留为补充学习入口；真题、听力、写作等需要后端的模块不在静态导航中展示。后端模式仍保留原功能。

## 静态离线版

```bash
python3 backend/scripts/export_frontend_daily_words.py
cd frontend
VITE_STATIC_MODE=true VITE_BASE_PATH=/liuji/ npm run build
cp dist/index.html dist/404.html
```

每日知识库由标准库 Python 脚本导出到 `frontend/public/data/daily_words.json`，引用的场景图复制到 `frontend/public/images/daily/`。每期必须有 20 个完整词条，否则构建失败。

GitHub Actions 会在 `main` 的每日英语单词目录、导出脚本或前端变更推送后，重新导出并发布。仅修改本机文件但不推送不会更新网站。通用题库仍由原来的 `export_frontend_vocabulary.py` 管理。

## 每天 11 点自动发布

macOS 安装（重复运行不会重复注册）：

```bash
/usr/bin/python3 backend/scripts/install_daily_publish.py
```

**首次安装后必须验证后台权限。** macOS 可能拒绝 launchd Python 读取桌面目录（错误日志为 `Operation not permitted`）。本机已观察到该问题，不能仅凭任务加载成功宣称定时发布可用。需在系统设置 → 隐私与安全性 → 完全磁盘访问权限中为实际解释器 `/Library/Developer/CommandLineTools/usr/bin/python3` 授权，再执行 `launchctl kickstart -k gui/$(id -u)/com.insistgang.liuji.daily-publish` 并核对日志；手动终端运行成功不能替代后台验证。

任务标签为 `com.insistgang.liuji.daily-publish`，每天本机时间 11:00 执行，11 点之后每 30 分钟补检，登录及唤醒后按系统调度补检。上午约 10 点的内容生成任务不由本脚本运行；电脑关机或未登录期间无法读取并上传本地新文件。

发布前要求当天词表存在、每期包含 20 个有效词条、当天配图已引用且存在、累计复习窗口存在。仅提交每日英语单词目录、导出 JSON 和每日配图；不提交 `.workbuddy` 或其他代码。已有暂存内容、非自动提交未推送、远端领先时停止，避免混入其他工作。重复执行无变化时不产生新提交；网络失败由下次补检重试。Git 推送走本机已有 SSH 身份，不在脚本中保存令牌。

```bash
# 校验已有日期，不提交不推送（会重新导出本地前端数据）
/usr/bin/python3 backend/scripts/publish_daily_words.py --date 2026-11-04 --dry-run
# 手动补发已有日期
/usr/bin/python3 backend/scripts/publish_daily_words.py --date 2026-11-04
# 查看后台任务
launchctl print gui/$(id -u)/com.insistgang.liuji.daily-publish
```

日志在 `~/Library/Logs/liuji-daily-publish.log` 和 `~/Library/Logs/liuji-daily-publish.error.log`。推送回执位于 `.git/daily-publish/last-success.json`。它只证明 Git 同步，不代表 Pages 部署成功；构建结果仍需查看 GitHub Actions。需要暂停可执行 `launchctl bootout gui/$(id -u)/com.insistgang.liuji.daily-publish`，之后重新运行安装脚本恢复。

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
