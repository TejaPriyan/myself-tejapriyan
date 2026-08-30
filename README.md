# 🏝️ Glass-Tech Sanctuary 2026

> Ultimate fusion of medicine, engineering, AI and play — a personal portfolio & gaming hub by **Myself Teja Priyan**.

Glass-Tech Sanctuary is a full-stack single-page application that blends a personal portfolio with an interactive "sanctuary" of zones: anatomy and medical study tools, engineering challenges, a suite of mini-games, a 3D showcase, and **Ami** — a warm AI assistant with chat, story, debate, and personality-analysis modes. It runs as an Express + Socket.IO server with a PWA-ready front end and real-time chat.

![Favicon](favicon.svg)
> **🌐 Live :** [myself-tejapriyan.onrender.com](https://myself-tejapriyan.onrender.com/) — try it now! 🚀
---

## ✨ Features

- 🩺 **Medical Zone** — anatomy & physiology study tools, health/BMI utilities, and interactive 3D models (e.g. human brain).
- ⚙️ **Engineer Zone** — engineering logic challenges and interactive 3D gadget models (cyberpunk laptop, guns, drones, U.F.O.).
- 🎮 **Game Zone (Mind & Skill Suite)** — a collection of playable mini-games with a tower-defense-style mode, XP, levels, and daily challenges.
- 🤖 **Ami AI (2026)** — smart chat assistant with pluggable AI providers and multiple modes:
  - General Q&A and study help
  - 🧪 **Quiz generation** on any topic (returns JSON questions)
  - ✍️ **Story mode** (creative collaborative storytelling)
  - 🗣️ **Debate mode** (argues the opposite side)
  - 🧠 **Personality analysis** based on chat history
- 🖼️ **AI image generation** with an automatic fallback chain: Magnific Flux 2 Pro → Cloudflare Worker → Pollinations.
- 🏆 **Board & Profile** — XP, levels, leaderboards, achievements, activity feed, and persistent user memory (Ami remembers you).
- 💬 **Real-time global chat** via Socket.IO.
- 📱 **PWA ready** — service worker (`sw.js`) with offline caching and installable web app manifest (`manifest.json`).
- 🎨 **Themes** — cream, dark, ocean, sunset, neon, lavender.
- 🔒 **Hardened static serving** — sensitive backend files (`.env`, `server.js`, `package.json`, raw JSON) are blocked from public access.

---

## 🧰 Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | HTML5, CSS3 (glassmorphism), vanilla JavaScript, Three.js (r128) + GLTFLoader |
| Backend   | Node.js, Express 4, Socket.IO |
| AI Chat   | OpenRouter (free models) → Groq → Google Gemini → Hugging Face → Pollinations → local fallback |
| AI Images | Magnific Flux 2 Pro → Cloudflare Worker → Pollinations |
| Data      | JSON file store (`database.json`, auto-created) |
| Extras    | PWA (Service Worker + manifest), compression middleware, dotenv |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **18+** (uses global `fetch` and `node --watch`)
- npm (ships with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/TejaPriyan/myself-tejapriyan.git
cd myself-tejapriyan

# 2. Install dependencies
npm install

# 3. Configure environment (optional, but recommended for AI features)
cp .env.example .env
#    → then fill in your API keys (see the Environment Variables table below)

# 4. Start the server
npm start
```

Open **http://localhost:3000** in your browser. The app works without any API keys (Ami falls back to a local assistant), but AI chat and image generation unlock with the keys below.

> Development mode with auto-restart: `npm run dev`

### .env example

```bash
PORT=3000
OPENROUTER_API_KEY=your_openrouter_key
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
HF_TOKEN=your_huggingface_token
POLLINATIONS_API_KEY=your_pollinations_key
MAGNIFIC_API_KEY=your_magnific_key
CF_IMAGE_API_URL=https://your-worker.example.workers.dev
CF_IMAGE_API_KEY=your_cloudflare_worker_key
RENDER_EXTERNAL_URL=https://your-app.onrender.com
```

---

## 🔑 Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | optional | HTTP port (default `3000`) |
| `OPENROUTER_API_KEY` | optional | Primary AI chat provider (tries free models first) |
| `GROQ_API_KEY` | optional | AI chat fallback #2 |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | optional | AI chat fallback #3 (Gemini) |
| `HF_TOKEN` / `HUGGINGFACE_API_KEY` | optional | AI chat fallback #4 (Hugging Face) |
| `POLLINATIONS_API_KEY` | optional | AI chat fallback #5 & image generation fallback #3 |
| `MAGNIFIC_API_KEY` | optional | Image generation primary provider |
| `CF_IMAGE_API_URL` | optional | Cloudflare Worker endpoint for image generation fallback #2 |
| `CF_IMAGE_API_KEY` | optional | Auth key for the Cloudflare Worker |
| `RENDER_EXTERNAL_URL` | optional | Public URL of the deployed app (used as OpenRouter referer) |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Serves the SPA (`index.html`) |
| POST | `/api/chat` | Ami AI chat (`{ message, history?, userId?, mode? }`) |
| POST | `/api/generate-image` | Generate an image with the fallback provider chain |
| GET | `/api/images/:filename` | Serve a generated image |
| GET | `/view/:filename` | View a generated image page |
| GET | `/api/gallery` | Latest generated images (last 20) |
| POST | `/api/user/xp` | Award XP to a user |
| GET | `/api/user/:id` | Get user profile |
| GET | `/api/leaderboard` | Global XP leaderboard |
| GET | `/api/daily-challenge` | Today's daily challenge |
| POST | `/api/daily-challenge/complete` | Mark the daily challenge complete |
| GET | `/api/achievements/:id` | A user's achievements |
| POST | `/api/user/profile` | Update user profile |
| GET | `/api/activity-feed` | Latest site activity |
| POST | `/api/health/bmi` | BMI calculation utility |
| WS | `/socket.io` | Real-time global chat & presence |

---

## 🗂️ Project Structure

```
myself-tejapriyan/
├── index.html            # The entire SPA (styles, markup & client JS)
├── server.js             # Express + Socket.IO backend & Ami AI logic
├── image-api-new.js      # Image generation provider chain
├── sw.js                 # Service worker (offline PWA caching)
├── manifest.json         # PWA web app manifest
├── favicon.svg           # Site icon
├── package.json          # npm metadata & scripts
├── .gitignore
├── .env.example          # Environment variable template
├── *.glb                 # 3D models (Three.js GLTF assets)
├── database.json         # Created at runtime — user data / chat memory / gallery
└── generated-images/     # Created at runtime — AI-generated images
```

> `database.json` and `generated-images/` are created automatically on first run and are excluded from version control.

---

## 🚢 Deployment

The app is a standard Node.js/Express server, so it deploys anywhere Node 18+ is available:

- **Render / Railway / Fly.io**: set the start command to `npm start`, add your env vars, and point `RENDER_EXTERNAL_URL` at your public URL.
- **Vercel / Netlify**: works with a serverless adapter, though Socket.IO and the JSON file store are best served from a long-running process.
- Any VPS: `npm install && npm start`, then reverse-proxy port `3000` with nginx/Caddy.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) first.

---

## 🔒 Security

Found a vulnerability? Please report it privately — see [SECURITY.md](SECURITY.md) for the responsible-disclosure policy.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE). © 2026 Myself Teja Priyan.
