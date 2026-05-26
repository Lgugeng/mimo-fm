# 🎙️ MiMo FM — AI 私人电台

> 基于小米 MiMo 大模型的 AI 电台，灵感来自 [Claudio FM](https://mmguo.dev/claudio-fm/)

将你的音乐品味蒸馏成一位 AI DJ，为你生成个性化电台节目 — 有音乐、有旁白、有故事。

## ✨ 核心功能

- **🎵 AI 电台** — 连接 Spotify 歌单，AI 自动生成电台节目（开场白 + 歌曲串讲 + 尾声）
- **💬 智能对话** — 与 MiMo AI 实时聊天，支持流式输出 + 语音播放
- **🎤 语音克隆** — 上传 3 秒音频，克隆任意声音作为 DJ 音色
- **🎨 声音设计** — 用文字描述设计音色（"温柔治愈系女声"）
- **📻 沉浸式电台 UI** — 暗色主题电台风格界面

## 🛠️ 技术栈

| 层 | 技术 |
|---|------|
| **LLM** | 小米 MiMo-V2.5-Pro（对话推理） |
| **TTS** | MiMo-V2.5-TTS / VoiceClone / VoiceDesign |
| **后端** | Python FastAPI + WebSocket + SSE |
| **前端** | React 18 + TypeScript + Vite + Tailwind CSS |
| **音乐** | Spotify Web API |
| **部署** | Docker + Nginx |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/mimo-fm.git
cd mimo-fm
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的 API Key
```

必需：
- `MIMO_API_KEY` — 在 [MiMo 平台](https://platform.xiaomimimo.com) 获取

可选：
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — [Spotify Developer](https://developer.spotify.com) 获取

### 3. Docker 部署（推荐）

```bash
docker-compose up -d
```

访问 http://localhost:3000

### 4. 本地开发

**后端：**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 📁 项目结构

```
mimo-fm/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── api/                 # API 路由
│   │   ├── chat.py          # 对话接口
│   │   ├── tts.py           # 语音合成接口
│   │   ├── spotify.py       # Spotify 接口
│   │   ├── radio.py         # 电台接口
│   │   └── websocket.py     # WebSocket 管理
│   ├── services/            # 业务逻辑
│   │   ├── mimo_llm.py      # MiMo LLM 服务
│   │   ├── mimo_tts.py      # MiMo TTS 服务
│   │   ├── spotify.py       # Spotify 服务
│   │   └── radio_engine.py  # 电台引擎
│   └── models/              # 数据模型
│       ├── schemas.py       # Pydantic 模型
│       └── db_models.py     # ORM 模型
├── frontend/
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # UI 组件
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── api/             # API 调用层
│   │   ├── contexts/        # React Context
│   │   └── types/           # TypeScript 类型
│   └── package.json
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── .env.example
```

## 🎯 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST (SSE) | 流式对话 |
| `/api/chat/sync` | POST | 同步对话 |
| `/api/tts/synthesize` | POST | 文字转语音 |
| `/api/tts/clone` | POST | 声音克隆 |
| `/api/tts/design` | POST | 声音设计 |
| `/api/spotify/auth` | GET | Spotify 授权 |
| `/api/spotify/playlists` | GET | 获取歌单列表 |
| `/api/radio/create` | POST | 创建电台节目 |
| `/api/radio/{id}/stream` | WS | 流式电台音频 |

## 📝 License

MIT
