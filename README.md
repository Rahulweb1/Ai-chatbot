# AI Chatbot & Desktop Assistant

> An advanced, full-stack AI Chatbot and Desktop Workspace powered by multi-model AI routing (Google Gemini, NVIDIA NIM, Llama 3.3, DeepSeek R1/V3), real-time web search grounding, live web document scraper, multilingual voice chat, system telemetry monitoring, sandboxed terminal execution, and file management.

---

## 🌟 Key Features

- **Multi-Model AI Engine Routing**:
  - **Google Gemini**: Gemini 2.5 Flash, Gemini 2.0 Flash/Pro, and Thought reasoning models.
  - **NVIDIA NIM Models**: Llama 3.3 70B, Nemotron 70B, DeepSeek R1 / V3, GLM 4 9B.
  - Automatic prompt routing that selects the best model based on the domain (coding, reasoning, fast response, or creative writing).
- **Real-Time Web Search & Document Analyzer**:
  - Automated Google Search Grounding for current news, facts, and live information.
  - Live Web Scraper endpoint (`/api/scrape`) to automatically fetch, extract clean text, and generate structured Markdown analysis reports from any web URL.
- **Multilingual Voice Engine**:
  - Native Speech-to-Text (STT) and Text-to-Speech (TTS) supporting **Tamil (ta-IN)** and **English (en-US)**.
  - Configurable voice playback speeds (0.5x to 2.0x).
- **System Telemetry & Hardware Monitoring**:
  - Real-time dashboard with animated gauge rings for CPU load, RAM usage, GPU temperature/utilization, battery level, and network traffic.
- **Sandboxed Terminal & File Workspace**:
  - Web-based CLI terminal for executing system commands with security guardrails.
  - Interactive file explorer to view and organize workspace files.
- **Desktop Automation & YouTube Launcher**:
  - Shortcuts for automation workflows and web search targets.

---

## 🔒 Security & Best Practices

1. **API Key Safety**:
   - Store API keys strictly in environment variables (`.env`). Never commit credentials or secrets to public version control.
2. **Local Network Binding**:
   - For local laptop usage, set `HOST=127.0.0.1` in `.env` to prevent unauthorized external network access.
3. **Protected Terminal Endpoints**:
   - Terminal and filesystem endpoints (`/api/terminal/exec`, `/api/files/*`) use strict validation to protect host machine safety.

---

## 📋 Prerequisites

- **Node.js**: `v18.0.0` or higher (`v20.x` recommended)
- **npm**: `v9.0.0` or higher
- **Git**: Installed on your system
- **Modern Browser**: Google Chrome, Brave, or Microsoft Edge (recommended for Web Speech API support)

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/ai-chatbot-desktop-assistant.git
cd ai-chatbot-desktop-assistant
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create a `.env` file:
```bash
cp .env.example .env
```

Open `.env` and add your API keys:
```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# NVIDIA NIM API Key (Optional for Llama 3.3 / DeepSeek models)
NVIDIA_API_KEY=your_nvidia_nim_api_key_here

# Network & Security Settings
HOST=127.0.0.1
TERMINAL_AUTH_TOKEN=your_secure_token_here
```

### 4. Start Development Mode
Launch the full-stack Express + Vite server:
```bash
npm run dev
```
Navigate to:
```
http://localhost:3000
```

### 5. Build for Production
To bundle the frontend assets and compile the standalone server:
```bash
# Build frontend and bundle server
npm run build

# Start production server
npm start
```

---

## 📁 Project Architecture

```
├── server.ts                 # Full-stack Express backend server & streaming API
├── src/
│   ├── App.tsx               # Main application container & state management
│   ├── index.css             # Tailwind CSS & HUD visual styling
│   ├── types.ts              # Shared TypeScript definitions
│   ├── components/
│   │   ├── ArcRing.tsx       # Animated reactor core HUD visualizer
│   │   ├── Sidebar.tsx       # 64px navigation rail
│   │   ├── WindowFrame.tsx   # Top header bar (Telemetry metrics, model badge, voice toggle)
│   │   ├── Chat/             # Chat view, message stream, and web scraper button
│   │   ├── Telemetry/        # Hardware gauge rings (CPU, RAM, GPU, Battery)
│   │   ├── Voice/            # Multilingual voice assistant view
│   │   ├── Automation/       # Document scraper & YouTube launcher
│   │   ├── Terminal/         # Web CLI terminal simulator
│   │   ├── Files/            # File workspace browser
│   │   └── Settings/         # Credentials & model manager
│   └── lib/
│       ├── providers.ts      # Multi-model routing engine (Gemini & NVIDIA NIM)
│       └── speech.ts         # Web Speech STT and TTS utilities
├── package.json              # Project scripts and dependencies
└── .env.example              # Environment variables template
```

---

## ⚡ Useful Scripts

| Command | Action |
| :--- | :--- |
| **`npm run dev`** | Runs development server on `http://localhost:3000` |
| **`npm run build`** | Bundles Vite frontend and esbuild CJS server into `dist/` |
| **`npm start`** | Runs the production build (`node dist/server.cjs`) |
| **`npm run lint`** | Runs TypeScript compiler type check (`tsc --noEmit`) |

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
