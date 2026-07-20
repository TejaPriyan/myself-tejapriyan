// ============================================================
// server.js - Glass-Tech Sanctuary ULTIMATE 2026 Edition
// Myself Teja Priyan - Tech Enthusiast
// ============================================================
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs2 = require('fs');
const compression = require('compression');
const { generateImageMultiAPI } = require('./image-api-new.js');

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DB_PATH = path.join(__dirname, 'database.json');
const IMAGES_DIR = path.join(__dirname, 'generated-images');
if (!fs2.existsSync(IMAGES_DIR)) fs2.mkdirSync(IMAGES_DIR, { recursive: true });

function loadDB() {
  try { return JSON.parse(fs2.readFileSync(DB_PATH, 'utf8')); }
  catch (e) { return { users: {}, gallery: [], chat: [], leaderboard: [], achievements: {}, dailyChallenges: {}, activityFeed: [], tournaments: {} }; }
}
function saveDB(db) {
  try { fs2.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch (e) { console.error('[DB] Failed to save database:', e.message); }
}
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, pingTimeout: 60000, pingInterval: 25000 });

app.use(compression());
app.use(express.json({ limit: '5mb' }));
// Security: Prevent serving sensitive backend files publicly
const ALLOWED_JSON = ['/manifest.json'];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  const ext = path.extname(p);
  // Block .env files, raw JS backend files, and .json except the whitelist
  if (p.startsWith('/.git') || p === '/.env') return res.status(403).send('Forbidden');
  if (ext === '.json' && !ALLOWED_JSON.includes(p)) return res.status(403).send('Forbidden');
  const blockedJsFiles = ['/server.js', '/image-api-new.js', '/package.json', '/package-lock.json'];
  if (blockedJsFiles.includes(p)) return res.status(403).send('Forbidden');
  next();
});
app.use(express.static(__dirname, { maxAge: '1d' }));

const AMI_SYSTEM_PROMPT = `You are "Ami", a calm, wise, and friendly AI assistant embedded in the Glass-Tech Sanctuary — a personal portfolio and gaming hub built by Teja Priyan.
You speak in a warm, concise, and slightly poetic tone. You can help with:
- Explaining games in the Mind & Skill Suite
- Medical/anatomy trivia and study help
- Engineering logic and code
- Generating custom quizzes on any topic (format as JSON: {"questions":[{"q":"...","opts":["A","B","C","D"],"a":0}]})
- Writing code snippets (wrap in triple backticks)
- Creating study plans
- Collaborative storytelling (continue the user's story creatively)
- Debating topics (argue the opposite side thoughtfully)
- Analyzing personality based on chat history
- General fun and knowledge
Keep answers under 200 words unless asked for detail. Use emojis sparingly but tastefully.`;

// ── Daily Challenge System ──────────────────────────────────────────────────
function getDailyChallenge() {
  const challenges = [
    { id: 'speed-quiz-7',  title: '⚡ Speed Demon',    desc: 'Score 7+ on Medical Speed Quiz',            game: 'speed-quiz',    target: 7,   xpReward: 50 },
    { id: 'memory-10',     title: '🧠 Sharp Mind',     desc: 'Complete Neural Memory in under 10 moves',  game: 'neural-memory', target: 10,  xpReward: 40 },
    { id: 'play-3-games',  title: '🎮 Game Explorer',  desc: 'Play 3 different games today',              game: 'any',           target: 3,   xpReward: 35 },
    { id: 'stacker-200',   title: '🏗️ Sky Builder',  desc: 'Reach 200px height in Stacker',         game: 'stacker',       target: 200, xpReward: 45 },
    { id: 'drug-match-all',title: '💊 Pharmacist',    desc: 'Match all drugs correctly',                 game: 'drug-matcher',  target: 6,   xpReward: 40 },
    { id: 'wordle-win',    title: '📝 Word Wizard',   desc: 'Win a Wordle game',                         game: 'wordle',        target: 1,   xpReward: 35 },
    { id: 'typing-50wpm',  title: '⌨️ Speed Typer',   desc: 'Reach 50+ WPM in Typing Race',             game: 'typing-race',   target: 50,  xpReward: 45 },
    { id: 'maze-3',        title: '🏃 Maze Master',   desc: 'Complete 3 maze levels',                   game: 'maze',          target: 3,   xpReward: 40 },
    { id: 'reaction-300',  title: '⚡ Lightning',          desc: 'Get under 300ms reaction time',             game: 'reaction',      target: 300, xpReward: 40 },
    { id: 'rhythm-80',     title: '🎵 Rhythm King',   desc: 'Score 80%+ in Rhythm Game',                game: 'rhythm',        target: 80,  xpReward: 50 },
    { id: 'ecg-5',         title: '💓 ECG Expert',    desc: 'Identify 5 ECG rhythms correctly',         game: 'ecg',           target: 5,   xpReward: 45 },
    { id: 'tower-10',      title: '🏰 Defender',      desc: 'Survive 10 waves in Tower Defense',        game: 'tower-defense', target: 10,  xpReward: 50 },
  ];
  const dayIndex = Math.floor(Date.now() / 86400000) % challenges.length;
  return challenges[dayIndex];
}

const ACHIEVEMENTS = {
  'first-game':       { title: '🎮 First Steps',     desc: 'Play your first game',                  icon: '🎮' },
  'xp-100':           { title: '⭐ Rising Star',      desc: 'Earn 100 XP',                           icon: '⭐' },
  'xp-500':           { title: '🌟 Shining Bright',  desc: 'Earn 500 XP',                           icon: '🌟' },
  'xp-1000':          { title: '💫 Legendary',        desc: 'Earn 1000 XP',                          icon: '💫' },
  'level-5':          { title: '🏅 Level 5',          desc: 'Reach Level 5',                         icon: '🏅' },
  'level-10':         { title: '🏆 Level 10',         desc: 'Reach Level 10',                        icon: '🏆' },
  'games-10':         { title: '🎯 Dedicated',        desc: 'Play 10 games total',                   icon: '🎯' },
  'games-50':         { title: '🔥 On Fire',          desc: 'Play 50 games total',                   icon: '🔥' },
  'quiz-master':      { title: '🧠 Quiz Master',      desc: 'Score 10/10 on Speed Quiz',             icon: '🧠' },
  'memory-master':    { title: '🃏 Memory Master',    desc: 'Complete memory in under 12 moves',     icon: '🃏' },
  'daily-complete':   { title: '📅 Daily Warrior',    desc: 'Complete a daily challenge',            icon: '📅' },
  'image-creator':    { title: '🎨 Artist',           desc: 'Generate 5 images',                     icon: '🎨' },
  'chat-10':          { title: '💬 Talkative',        desc: 'Send 10 messages to Ami',               icon: '💬' },
  'all-zones':        { title: '🗺️ Explorer',         desc: 'Visit all zones',                       icon: '🗺️' },
  'pong-win':         { title: '🏓 Pong Champ',       desc: 'Win a Pong game',                       icon: '🏓' },
  'chess-win':        { title: '♟️ Chess Master',     desc: 'Win a chess game',                      icon: '♟️' },
  'wordle-win':       { title: '📝 Wordsmith',        desc: 'Complete a Wordle',                     icon: '📝' },
  'rhythm-king':      { title: '🎵 Rhythm King',      desc: 'Score 90%+ in Rhythm Game',             icon: '🎵' },
  'maze-runner':      { title: '🏃 Maze Runner',      desc: 'Complete 5 maze levels',                icon: '🏃' },
  'ecg-expert':       { title: '💓 ECG Expert',       desc: 'Identify 10 ECG rhythms',               icon: '💓' },
  'tower-hero':       { title: '🏰 Tower Hero',       desc: 'Survive 15 waves',                      icon: '🏰' },
  'social-butterfly': { title: '🦋 Social Butterfly', desc: 'Send 20 global chat messages',          icon: '🦋' },
};

// ── API Routes ────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── Serve raw generated images (for embedding) ──
app.get('/api/images/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs2.existsSync(filePath)) return res.status(404).send('Image not found');
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.sendFile(filePath);
});

// ── Branded Image Viewer Page ──
app.get('/view/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs2.existsSync(filePath)) return res.status(404).send('Image not found');

  // Look up prompt from gallery
  const db = loadDB();
  const entry = (db.gallery || []).find(g => g.url && g.url.includes(filename));
  const prompt = entry?.prompt || 'AI Generated Image';
  const createdAt = entry?.createdAt ? new Date(entry.createdAt).toLocaleString() : '';
  const apiUsed = entry?.api || 'Unknown';
  const imageUrl = `/api/images/${filename}`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${prompt.slice(0, 60)} — Teja Priyan Image Model</title>
  <meta name="description" content="Image generated by Teja Priyan Image Model: ${prompt.slice(0, 120)}">
  <meta property="og:title" content="Teja Priyan Image Model">
  <meta property="og:description" content="${prompt.slice(0, 200)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:type" content="website">
  <link rel="icon" href="/favicon.svg">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0a0a0f;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow-x: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        radial-gradient(ellipse at 20% 20%, rgba(88, 60, 255, 0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(0, 210, 255, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(255, 60, 170, 0.06) 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
    }

    /* Header */
    .header {
      width: 100%;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 15, 25, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #7c3aed, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);
    }
    .brand-text h1 {
      font-size: 15px;
      font-weight: 700;
      background: linear-gradient(135deg, #c4b5fd, #67e8f9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.3px;
    }
    .brand-text span {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
      font-weight: 400;
    }
    .header-actions { display: flex; gap: 8px; }
    .header-btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #c0c0c0;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-btn:hover {
      background: rgba(124, 58, 237, 0.2);
      border-color: rgba(124, 58, 237, 0.4);
      color: #fff;
    }
    .header-btn.primary {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      border-color: transparent;
      color: #fff;
    }
    .header-btn.primary:hover {
      box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
      transform: translateY(-1px);
    }

    /* Main */
    .main {
      flex: 1;
      width: 100%;
      max-width: 1100px;
      padding: 32px 24px 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      position: relative;
      z-index: 1;
    }

    /* Image Container */
    .image-container {
      width: 100%;
      max-width: 800px;
      border-radius: 16px;
      overflow: hidden;
      background: rgba(20, 20, 35, 0.6);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow:
        0 4px 30px rgba(0, 0, 0, 0.4),
        0 0 60px rgba(124, 58, 237, 0.08);
      position: relative;
    }
    .image-container img {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.4s ease;
    }
    .image-container:hover img { transform: scale(1.02); }

    /* Info Card */
    .info-card {
      width: 100%;
      max-width: 800px;
      padding: 24px;
      border-radius: 14px;
      background: rgba(20, 20, 35, 0.5);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.07);
    }
    .info-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: rgba(255,255,255,0.35);
      margin-bottom: 8px;
      font-weight: 600;
    }
    .info-prompt {
      font-size: 15px;
      line-height: 1.6;
      color: rgba(255,255,255,0.85);
      font-weight: 400;
    }
    .info-meta {
      display: flex;
      gap: 24px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.06);
      flex-wrap: wrap;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-item .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.3);
      font-weight: 600;
    }
    .meta-item .value {
      font-size: 13px;
      color: #c4b5fd;
      font-weight: 500;
    }

    /* Footer */
    .footer {
      width: 100%;
      padding: 20px;
      text-align: center;
      color: rgba(255,255,255,0.25);
      font-size: 12px;
      border-top: 1px solid rgba(255,255,255,0.04);
      background: rgba(10, 10, 15, 0.5);
      position: relative;
      z-index: 1;
    }
    .footer a {
      color: #c4b5fd;
      text-decoration: none;
    }
    .footer a:hover { text-decoration: underline; }

    @media (max-width: 600px) {
      .header { padding: 12px 16px; }
      .main { padding: 20px 16px 32px; }
      .info-meta { gap: 16px; }
      .header-actions .label-text { display: none; }
    }
  </style>
</head>
<body>
  <header class="header">
    <a href="/" class="brand">
      <div class="brand-icon">✨</div>
      <div class="brand-text">
        <h1>Teja Priyan Image Model</h1>
        <span>AI-Powered Image Generation</span>
      </div>
    </a>
    <div class="header-actions">
      <a href="${imageUrl}" download="${filename}" class="header-btn primary">⬇ <span class="label-text">Download</span></a>
      <a href="/" class="header-btn">🌿 <span class="label-text">Sanctuary</span></a>
    </div>
  </header>

  <main class="main">
    <div class="image-container">
      <img src="${imageUrl}" alt="${prompt.slice(0, 100).replace(/"/g, '&quot;')}" loading="eager">
    </div>
    <div class="info-card">
      <div class="info-label">Prompt</div>
      <p class="info-prompt">${prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      <div class="info-meta">
        <div class="meta-item">
          <span class="label">Model</span>
          <span class="value">Teja Priyan Image Model</span>
        </div>
        <div class="meta-item">
          <span class="label">Engine</span>
          <span class="value">${apiUsed}</span>
        </div>
        <div class="meta-item">
          <span class="label">Resolution</span>
          <span class="value">1024 × 1024</span>
        </div>
        ${createdAt ? `<div class="meta-item"><span class="label">Created</span><span class="value">${createdAt}</span></div>` : ''}
      </div>
    </div>
  </main>

  <footer class="footer">
    Made with 💜 by <a href="/">Myself Teja Priyan</a> — Glass-Tech Sanctuary 2026
  </footer>
</body>
</html>`);
});

// ── Image Generation with Magnific API (Primary) + Pollinations (Fallback) ──
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });
  
  try {
    console.log('[IMG] 🎨 Starting image generation for:', prompt.slice(0, 50) + '...');
    
    // Use the multi-API generator (Magnific primary, Cloudflare + Pollinations fallback)
    const { imageUrl, usedAPI, isBase64 } = await generateImageMultiAPI(prompt);
    
    if (!imageUrl) {
      console.error('[IMG] ❌ All APIs failed');
      return res.status(500).json({ error: 'All image generation APIs failed' });
    }
    
    console.log(`[IMG] ✅ Success using: ${usedAPI}`);
    
    // If base64, save to disk and return a clean URL
    let finalUrl = imageUrl;
    let viewUrl = imageUrl;
    if (isBase64 && imageUrl.startsWith('data:')) {
      try {
        const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'png' ? 'png' : matches[1] === 'webp' ? 'webp' : 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          fs2.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
          finalUrl = `/api/images/${filename}`;
          viewUrl = `/view/${filename}`;
          console.log(`[IMG] 💾 Saved base64 image as: ${filename}`);
        }
      } catch (saveErr) {
        console.error('[IMG] Failed to save image file:', saveErr.message);
        // Keep the base64 URL as fallback
      }
    }
    
    // Save to gallery (use raw image URL for embedding)
    const db = loadDB();
    const entry = { 
      id: Date.now().toString(), 
      prompt: prompt.trim(), 
      url: finalUrl,
      viewUrl: viewUrl,
      createdAt: new Date().toISOString(),
      api: usedAPI
    };
    db.gallery.unshift(entry);
    if (db.gallery.length > 100) db.gallery = db.gallery.slice(0, 100);
    saveDB(db);
    
    res.json({ success: true, url: finalUrl, viewUrl, usedAPI });
  } catch (e) {
    console.error('[IMG] Fatal error:', e.message);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

app.get('/api/gallery', (req, res) => { res.json((loadDB().gallery || []).slice(0, 20)); });

// â”€â”€ Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/chat', async (req, res) => {
  const { message, history, userId, mode } = req.body;
  if (!message) return res.status(400).json({ error: 'No message' });
  try {
    if (!OPENROUTER_API_KEY) throw new Error('No API key');
    let systemPrompt = AMI_SYSTEM_PROMPT;
    if (mode === 'story') systemPrompt += '\n\nYou are now in STORY MODE. Continue the user\'s story creatively with 2-3 paragraphs. Be vivid and engaging.';
    if (mode === 'debate') systemPrompt += '\n\nYou are now in DEBATE MODE. Argue the OPPOSITE side of whatever the user says. Be respectful but firm with logical counter-arguments.';
    if (mode === 'personality') systemPrompt += '\n\nAnalyze the user\'s personality based on their chat history. Be insightful, warm, and psychological.';

    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    const db = loadDB();
    const mem = db.users?.[userId]?.amiMemory || [];
    for (const m of mem.slice(-5)) messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
    if (history?.length) for (const h of history.slice(-8)) messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text });
    messages.push({ role: 'user', content: message });

    // Try multiple free models in order â€” if one is rate-limited, fall to next
    const FREE_MODELS = [
      'openai/gpt-oss-20b:free',
      'google/gemma-3-12b-it:free',
      'google/gemma-3-4b-it:free',
      'liquid/lfm-2.5-1.2b-instruct:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'nousresearch/hermes-3-llama-3.1-405b:free',
    ];

    let reply = null;
    let lastError = '';
    for (const model of FREE_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`,
            'X-Title': 'Glass-Tech Sanctuary'
          },
          body: JSON.stringify({ model, messages, max_tokens: 700, temperature: mode === 'story' ? 0.9 : mode === 'debate' ? 0.8 : 0.7 })
        });
        if (response.status === 429 || response.status === 503) {
          lastError = `API ${response.status}`;
          console.log(`[Ami] Model ${model} rate limited, trying next...`);
          continue; // try next model
        }
        if (!response.ok) throw new Error(`API ${response.status}`);
        const data = await response.json();
        reply = data.choices?.[0]?.message?.content || null;
        if (reply) { console.log(`[Ami] Responded using: ${model}`); break; }
      } catch (e) {
        lastError = e.message;
        console.log(`[Ami] Model ${model} failed: ${e.message}`);
      }
    }

    if (!reply) throw new Error(lastError || 'All models failed');

    if (userId && db.users?.[userId]) {
      if (!db.users[userId].amiMemory) db.users[userId].amiMemory = [];
      db.users[userId].amiMemory.push({ role: 'user', text: message }, { role: 'assistant', text: reply });
      if (db.users[userId].amiMemory.length > 40) db.users[userId].amiMemory = db.users[userId].amiMemory.slice(-30);
      db.users[userId].chatCount = (db.users[userId].chatCount || 0) + 1;
      saveDB(db);
    }
    res.json({ reply });
  } catch (e) {
    console.error('Chat error:', e.message);
    // Fallback response
    res.json({ reply: "ðŸŒ¿ I'm having a little trouble connecting to my brain right now. But don't worry â€” I'm still here! Want to play a game or explore the Sanctuary? ðŸŒŸ" });
  }
});

// â”€â”€ User XP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/api/user/xp', (req, res) => {
  const { userId, xpGain, game } = req.body;
  if (!userId) return res.status(400).json({ error: 'No userId' });
  const db = loadDB();
  if (!db.users[userId]) db.users[userId] = { xp: 0, level: 1, gamesPlayed: {}, joinedAt: new Date().toISOString(), achievements: [], chatCount: 0, totalGames: 0, dailyProgress: {}, visitedZones: [], globalChats: 0, activityHistory: [] };
  const user = db.users[userId];
  user.xp += (xpGain || 10);
  user.level = Math.floor(user.xp / 100) + 1;
  if (game) { user.gamesPlayed[game] = (user.gamesPlayed[game] || 0) + 1; user.totalGames = (user.totalGames || 0) + 1; }

  // Track activity for heatmap
  const today = new Date().toISOString().split('T')[0];
  if (!user.activityHistory) user.activityHistory = [];
  const todayEntry = user.activityHistory.find(a => a.date === today);
  if (todayEntry) todayEntry.xp += (xpGain || 10);
  else user.activityHistory.push({ date: today, xp: xpGain || 10 });
  if (user.activityHistory.length > 365) user.activityHistory = user.activityHistory.slice(-365);

  // Activity feed
  if (!db.activityFeed) db.activityFeed = [];
  if (game) {
    db.activityFeed.unshift({ userId, username: user.username || userId.slice(0, 10), game, xp: xpGain, time: new Date().toISOString() });
    if (db.activityFeed.length > 50) db.activityFeed = db.activityFeed.slice(0, 50);
  }

  // Check achievements
  const newAchievements = [];
  if (!user.achievements) user.achievements = [];
  const checks = [
    ['first-game', () => user.totalGames >= 1], ['xp-100', () => user.xp >= 100], ['xp-500', () => user.xp >= 500],
    ['xp-1000', () => user.xp >= 1000], ['level-5', () => user.level >= 5], ['level-10', () => user.level >= 10],
    ['games-10', () => user.totalGames >= 10], ['games-50', () => user.totalGames >= 50],
    ['social-butterfly', () => (user.globalChats || 0) >= 20],
  ];
  for (const [id, check] of checks) {
    if (!user.achievements.includes(id) && check()) { user.achievements.push(id); newAchievements.push({ id, ...ACHIEVEMENTS[id] }); }
  }

  saveDB(db);
  io.emit('xp-update', { userId, xp: user.xp, level: user.level });
  if (game) io.emit('activity-feed', { userId, username: user.username || userId.slice(0, 10), game, xp: xpGain });
  res.json({ xp: user.xp, level: user.level, newAchievements });
});

app.get('/api/user/:id', (req, res) => {
  const user = loadDB().users[req.params.id] || { xp: 0, level: 1, gamesPlayed: {}, achievements: [], totalGames: 0, activityHistory: [] };
  res.json(user);
});

app.get('/api/leaderboard', (req, res) => {
  const db = loadDB();
  const sorted = Object.entries(db.users).map(([id, u]) => ({
    id, xp: u.xp || 0, level: u.level || 1, username: u.username || id.slice(0, 10), avatar: u.avatar || 'ðŸ§‘â€ðŸ’»',
    totalGames: u.totalGames || 0, achievements: (u.achievements || []).length
  })).sort((a, b) => b.xp - a.xp).slice(0, 30);
  res.json(sorted);
});

app.get('/api/daily-challenge', (req, res) => res.json(getDailyChallenge()));

app.post('/api/daily-challenge/complete', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'No userId' });
  const db = loadDB();
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'Not found' });
  const challenge = getDailyChallenge();
  const today = new Date().toISOString().split('T')[0];
  if (!user.dailyProgress) user.dailyProgress = {};
  if (user.dailyProgress[today]) return res.json({ already: true });
  user.dailyProgress[today] = challenge.id;
  user.xp += challenge.xpReward;
  user.level = Math.floor(user.xp / 100) + 1;
  if (!user.achievements) user.achievements = [];
  if (!user.achievements.includes('daily-complete')) user.achievements.push('daily-complete');
  saveDB(db);
  res.json({ success: true, xpReward: challenge.xpReward, xp: user.xp, level: user.level });
});

app.get('/api/achievements/:id', (req, res) => {
  const user = loadDB().users[req.params.id];
  const earned = user?.achievements || [];
  res.json(Object.entries(ACHIEVEMENTS).map(([id, a]) => ({ id, ...a, earned: earned.includes(id) })));
});

app.post('/api/user/profile', (req, res) => {
  const { userId, username, bio, avatar } = req.body;
  if (!userId) return res.status(400).json({ error: 'No userId' });
  const db = loadDB();
  if (!db.users[userId]) db.users[userId] = { xp: 0, level: 1, gamesPlayed: {}, joinedAt: new Date().toISOString(), achievements: [], totalGames: 0 };
  if (username) db.users[userId].username = username.slice(0, 20);
  if (bio) db.users[userId].bio = bio.slice(0, 100);
  if (avatar) db.users[userId].avatar = avatar;
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/activity-feed', (req, res) => {
  res.json((loadDB().activityFeed || []).slice(0, 20));
});

app.post('/api/health/bmi', (req, res) => {
  const { height, weight, age, gender } = req.body;
  if (!height || !weight) return res.status(400).json({ error: 'Need height/weight' });
  const h = parseFloat(height) / 100, w = parseFloat(weight);
  const bmi = w / (h * h);
  let cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmr = gender === 'female' ? 447.593 + (9.247 * w) + (3.098 * parseFloat(height)) - (4.330 * (age || 25)) : 88.362 + (13.397 * w) + (4.799 * parseFloat(height)) - (5.677 * (age || 25));
  res.json({ bmi: Math.round(bmi * 10) / 10, category: cat, bmr: Math.round(bmr), dailyWater: Math.round(w * 0.033 * 10) / 10, idealWeightLow: Math.round(18.5 * h * h), idealWeightHigh: Math.round(24.9 * h * h) });
});

// â”€â”€ Socket.io â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const pongRooms = {}, tttRooms = {}, c4Rooms = {}, chessRooms = {}, rpsRooms = {}, snakeRooms = {}, floodRooms = {};
let onlineUsers = new Set();

io.on('connection', (socket) => {
  onlineUsers.add(socket.id);
  io.emit('online-count', onlineUsers.size);

  socket.on('set-user', (data) => { socket.userId = data.userId; socket.username = data.username; });

  // â”€â”€ Game Invite System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // When a user clicks Online in any game, notify all OTHER connected users
  socket.on('game-invite', (data) => {
    // data: { game, gameIcon, gameName, fromUser, fromUsername }
    // Broadcast to all sockets EXCEPT the sender
    socket.broadcast.emit('game-invite', {
      game: data.game,
      gameIcon: data.gameIcon,
      gameName: data.gameName,
      fromUser: data.fromUser,
      fromUsername: data.fromUsername || 'Someone',
      socketId: socket.id
    });
  });

  // â”€â”€ Global Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('global-chat', (data) => {
    const msg = { id: Date.now().toString(), userId: data.userId, username: data.username || 'Anon', text: (data.text || '').slice(0, 500), timestamp: new Date().toISOString(), reactions: {} };
    io.emit('global-chat', msg);
    const db = loadDB();
    db.chat.push(msg);
    if (db.chat.length > 200) db.chat = db.chat.slice(-100);
    if (db.users[data.userId]) { db.users[data.userId].globalChats = (db.users[data.userId].globalChats || 0) + 1; }
    saveDB(db);
  });

  // â”€â”€ Chat Reactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('chat-reaction', (data) => { io.emit('chat-reaction', data); });

  // â”€â”€ Canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('canvas-draw', (data) => socket.broadcast.emit('canvas-draw', data));
  socket.on('canvas-clear', () => io.emit('canvas-clear'));

  // â”€â”€ Pong â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('pong-join', (data) => {
    let roomId = null;
    for (const [id, room] of Object.entries(pongRooms)) { if (room.players.length < 2 && room.state === 'waiting') { roomId = id; break; } }
    if (!roomId) { roomId = 'pong-' + Date.now(); pongRooms[roomId] = { players: [], ball: { x: 400, y: 300, vx: 4, vy: 3 }, scores: [0, 0], state: 'waiting' }; }
    const room = pongRooms[roomId];
    const pi = room.players.length;
    room.players.push({ id: socket.id, userId: data.userId, index: pi, y: 250 });
    socket.join(roomId); socket.pongRoom = roomId; socket.pongIndex = pi;
    socket.emit('pong-assigned', { roomId, playerIndex: pi });
    if (room.players.length === 2) { room.state = 'playing'; io.to(roomId).emit('pong-start'); startPongLoop(roomId); }
    else socket.emit('pong-waiting');
  });
  socket.on('pong-paddle', (data) => { const r = pongRooms[socket.pongRoom]; if (r?.players[socket.pongIndex]) r.players[socket.pongIndex].y = data.y; });

  // â”€â”€ TTT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('ttt-join', (data) => {
    let roomId = null;
    for (const [id, room] of Object.entries(tttRooms)) { if (room.players.length < 2 && room.state === 'waiting') { roomId = id; break; } }
    if (!roomId) { roomId = 'ttt-' + Date.now(); tttRooms[roomId] = { players: [], state: 'waiting' }; }
    const room = tttRooms[roomId];
    const sym = room.players.length === 0 ? 'X' : 'O';
    room.players.push({ id: socket.id, userId: data.userId, symbol: sym });
    socket.join(roomId); socket.tttRoom = roomId; socket.tttSymbol = sym;
    socket.emit('ttt-assigned', { symbol: sym });
    if (room.players.length === 2) { room.state = 'playing'; io.to(roomId).emit('ttt-start'); }
  });
  socket.on('ttt-move', (data) => { if (socket.tttRoom) socket.to(socket.tttRoom).emit('ttt-move', data); });

  // â”€â”€ C4 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('c4-join', (data) => {
    let roomId = null;
    for (const [id, room] of Object.entries(c4Rooms)) { if (room.players.length < 2 && room.state === 'waiting') { roomId = id; break; } }
    if (!roomId) { roomId = 'c4-' + Date.now(); c4Rooms[roomId] = { players: [], state: 'waiting' }; }
    const room = c4Rooms[roomId];
    const col = room.players.length === 0 ? 'red' : 'yellow';
    room.players.push({ id: socket.id, userId: data.userId, color: col });
    socket.join(roomId); socket.c4Room = roomId; socket.c4Color = col;
    socket.emit('c4-assigned', { color: col });
    if (room.players.length === 2) { room.state = 'playing'; io.to(roomId).emit('c4-start'); }
  });
  socket.on('c4-move', (data) => { if (socket.c4Room) socket.to(socket.c4Room).emit('c4-move', data); });

  // â”€â”€ Chess â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('chess-join', (data) => {
    let roomId = null;
    for (const [id, room] of Object.entries(chessRooms)) { if (room.players.length < 2 && room.state === 'waiting') { roomId = id; break; } }
    if (!roomId) { roomId = 'chess-' + Date.now(); chessRooms[roomId] = { players: [], state: 'waiting' }; }
    const room = chessRooms[roomId];
    const col = room.players.length === 0 ? 'white' : 'black';
    room.players.push({ id: socket.id, userId: data.userId, color: col });
    socket.join(roomId); socket.chessRoom = roomId; socket.chessColor = col;
    socket.emit('chess-assigned', { color: col });
    if (room.players.length === 2) { room.state = 'playing'; io.to(roomId).emit('chess-start'); }
  });
  socket.on('chess-move', (data) => { if (socket.chessRoom) socket.to(socket.chessRoom).emit('chess-move', data); });

  // â”€â”€ RPS (FIXED â€” uses socket.id as key for guaranteed uniqueness) â”€â”€
  socket.on('rps-join', (data) => {
    // Clean up any existing room for this socket
    if (socket.rpsRoom && rpsRooms[socket.rpsRoom]) {
      const old = rpsRooms[socket.rpsRoom];
      old.players = old.players.filter(p => p.id !== socket.id);
      if (old.players.length === 0) delete rpsRooms[socket.rpsRoom];
    }
    let roomId = null;
    for (const [id, room] of Object.entries(rpsRooms)) {
      if (room.players.length < 2 && room.state === 'waiting') { roomId = id; break; }
    }
    if (!roomId) {
      roomId = 'rps-' + Date.now();
      rpsRooms[roomId] = { players: [], choices: {}, state: 'waiting' };
    }
    const room = rpsRooms[roomId];
    room.players.push({ id: socket.id, userId: data.userId });
    socket.join(roomId); socket.rpsRoom = roomId; socket.rpsUserId = data.userId;
    if (room.players.length === 1) {
      socket.emit('rps-waiting', { room: roomId });
    } else {
      room.state = 'playing';
      // Send each player their socketId so they can identify their own choice
      const p0 = room.players[0], p1 = room.players[1];
      io.to(p0.id).emit('rps-start', { room: roomId, myId: p0.userId, oppId: p1.userId, mySocketId: p0.id });
      io.to(p1.id).emit('rps-start', { room: roomId, myId: p1.userId, oppId: p0.userId, mySocketId: p1.id });
    }
  });
  socket.on('rps-move', (data) => {
    const room = rpsRooms[data.room];
    if (!room || room.state !== 'playing') return;
    // Use socket.id as key to guarantee uniqueness (fixes the bug where userId could collide)
    room.choices[socket.id] = data.choice;
    console.log(`[RPS] ${socket.id} chose ${data.choice} in ${data.room}, total choices: ${Object.keys(room.choices).length}`);
    // Acknowledge to sender
    socket.emit('rps-choice-ack', { choice: data.choice });
    // Both players chose â€” send result with socketId-keyed choices
    if (Object.keys(room.choices).length === 2) {
      // Build a result that maps each player's socketId to their choice
      const result = {};
      room.players.forEach(p => {
        result[p.id] = room.choices[p.id];
      });
      console.log('[RPS] Both chose, sending result:', JSON.stringify(result));
      io.to(data.room).emit('rps-result', { choices: result });
      room.choices = {}; // reset for next round
    }
  });
  socket.on('rps-cancel', () => {
    if (socket.rpsRoom && rpsRooms[socket.rpsRoom]) {
      const r = rpsRooms[socket.rpsRoom];
      r.players = r.players.filter(p => p.id !== socket.id);
      if (r.players.length === 0) delete rpsRooms[socket.rpsRoom];
      else io.to(socket.rpsRoom).emit('rps-opponent-left');
    }
    socket.rpsRoom = null;
  });

  // â”€â”€ Snake Battle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('snake-join', (data) => {
    if (socket.snakeRoom && snakeRooms[socket.snakeRoom]) {
      const old = snakeRooms[socket.snakeRoom];
      old.players = old.players.filter(p => p.id !== socket.id);
      if (old.players.length === 0) delete snakeRooms[socket.snakeRoom];
    }
    let roomId = null;
    for (const [id, room] of Object.entries(snakeRooms)) {
      if (room.players.length < 2 && room.state === 'waiting') { roomId = id; break; }
    }
    if (!roomId) {
      roomId = 'snake-' + Date.now();
      snakeRooms[roomId] = { players: [], state: 'waiting' };
    }
    const room = snakeRooms[roomId];
    const playerIndex = room.players.length;
    room.players.push({ id: socket.id, userId: data.userId, index: playerIndex });
    socket.join(roomId); socket.snakeRoom = roomId; socket.snakeIndex = playerIndex;
    socket.emit('snake-assigned', { index: playerIndex, room: roomId });
    if (room.players.length === 1) {
      socket.emit('snake-waiting');
    } else {
      room.state = 'playing';
      io.to(roomId).emit('snake-start', { room: roomId });
    }
  });
  socket.on('snake-state', (data) => {
    if (socket.snakeRoom) socket.to(socket.snakeRoom).emit('snake-state', data);
  });
  socket.on('snake-died', (data) => {
    if (socket.snakeRoom) io.to(socket.snakeRoom).emit('snake-died', { ...data, loser: socket.snakeIndex });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  socket.on('flood-join', (data) => {
    if (socket.floodRoom && floodRooms[socket.floodRoom]) {
      const old = floodRooms[socket.floodRoom];
      old.players = old.players.filter(p => p.id !== socket.id);
      if (old.players.length === 0) delete floodRooms[socket.floodRoom];
    }
    let roomId = null;
    for (const [id, room] of Object.entries(floodRooms)) {
      if (room.players.length < 2 && room.state === 'waiting') { roomId = id; break; }
    }
    if (!roomId) {
      roomId = 'flood-' + Date.now();
      // Generate shared board
      const COLS = ['#E74C3C','#3498DB','#2ECC71','#F1C40F','#9B59B6','#E67E22'];
      const SIZE = 10;
      const board = Array(SIZE*SIZE).fill(0).map(()=>Math.floor(Math.random()*6));
      floodRooms[roomId] = { players: [], state: 'waiting', board, size: SIZE, colors: COLS };
    }
    const room = floodRooms[roomId];
    const playerIndex = room.players.length;
    room.players.push({ id: socket.id, userId: data.userId, index: playerIndex });
    socket.join(roomId); socket.floodRoom = roomId; socket.floodIndex = playerIndex;
    socket.emit('flood-assigned', { index: playerIndex, room: roomId, board: room.board, size: room.size, colors: room.colors });
    if (room.players.length === 1) {
      socket.emit('flood-waiting');
    } else {
      room.state = 'playing';
      io.to(roomId).emit('flood-start', { room: roomId, board: room.board, size: room.size, colors: room.colors });
    }
  });
  socket.on('flood-move', (data) => {
    if (socket.floodRoom) io.to(socket.floodRoom).emit('flood-move', { ...data, playerIndex: socket.floodIndex });
  });
  socket.on('flood-win', (data) => {
    if (socket.floodRoom) io.to(socket.floodRoom).emit('flood-win', { ...data, winner: socket.floodIndex });
  });

  // â”€â”€ Pictionary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('pictionary-draw', (data) => socket.broadcast.emit('pictionary-draw', data));
  socket.on('pictionary-new-round', (data) => socket.broadcast.emit('pictionary-new-round', data));
  socket.on('pictionary-guess', (data) => socket.broadcast.emit('pictionary-guess', data));
  socket.on('pictionary-clear', () => socket.broadcast.emit('pictionary-clear'));


  // â”€â”€ Pixel Art â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('pixel-update', (data) => socket.broadcast.emit('pixel-update', data));
  socket.on('pixel-clear', () => socket.broadcast.emit('pixel-clear'));

  // â”€â”€ Drawing Race â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('drawrace-draw', (data) => socket.broadcast.emit('drawrace-draw', data));
  socket.on('drawrace-start', (data) => socket.broadcast.emit('drawrace-start', data));

  // â”€â”€ Disconnect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('online-count', onlineUsers.size);
    if (socket.pongRoom && pongRooms[socket.pongRoom]) { const r = pongRooms[socket.pongRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete pongRooms[socket.pongRoom]; else { r.state = 'ended'; io.to(socket.pongRoom).emit('pong-opponent-left'); } }
    if (socket.tttRoom && tttRooms[socket.tttRoom]) { const r = tttRooms[socket.tttRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete tttRooms[socket.tttRoom]; else io.to(socket.tttRoom).emit('ttt-opponent-left'); }
    if (socket.c4Room && c4Rooms[socket.c4Room]) { const r = c4Rooms[socket.c4Room]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete c4Rooms[socket.c4Room]; else io.to(socket.c4Room).emit('c4-opponent-left'); }
    if (socket.chessRoom && chessRooms[socket.chessRoom]) { const r = chessRooms[socket.chessRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete chessRooms[socket.chessRoom]; else io.to(socket.chessRoom).emit('chess-opponent-left'); }
    if (socket.rpsRoom && rpsRooms[socket.rpsRoom]) { const r = rpsRooms[socket.rpsRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete rpsRooms[socket.rpsRoom]; else io.to(socket.rpsRoom).emit('rps-opponent-left'); }
    if (socket.snakeRoom && snakeRooms[socket.snakeRoom]) { const r = snakeRooms[socket.snakeRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete snakeRooms[socket.snakeRoom]; else io.to(socket.snakeRoom).emit('snake-opponent-left'); }
    if (socket.floodRoom && floodRooms[socket.floodRoom]) { const r = floodRooms[socket.floodRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete floodRooms[socket.floodRoom]; else io.to(socket.floodRoom).emit('flood-opponent-left'); }
  });
});

// â”€â”€ Pong Loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startPongLoop(roomId) {
  const iv = setInterval(() => {
    const room = pongRooms[roomId];
    if (!room || room.state !== 'playing' || room.players.length < 2) { clearInterval(iv); return; }
    const b = room.ball;
    b.x += b.vx; b.y += b.vy;
    if (b.y <= 10 || b.y >= 590) b.vy *= -1;
    const p0 = room.players[0], p1 = room.players[1];
    if (b.x <= 30 && b.x >= 20 && b.y >= p0.y && b.y <= p0.y + 100) { b.vx = Math.abs(b.vx) + 0.3; b.vy += (Math.random() - 0.5) * 2; }
    if (b.x >= 770 && b.x <= 780 && b.y >= p1.y && b.y <= p1.y + 100) { b.vx = -(Math.abs(b.vx) + 0.3); b.vy += (Math.random() - 0.5) * 2; }
    if (b.x < 0) { room.scores[1]++; Object.assign(b, { x: 400, y: 300, vx: 4, vy: (Math.random() - 0.5) * 6 }); }
    else if (b.x > 800) { room.scores[0]++; Object.assign(b, { x: 400, y: 300, vx: -4, vy: (Math.random() - 0.5) * 6 }); }
    b.vx = Math.max(-12, Math.min(12, b.vx)); b.vy = Math.max(-8, Math.min(8, b.vy));
    io.to(roomId).emit('pong-state', { ball: { x: b.x, y: b.y }, paddles: [p0.y, p1.y], scores: room.scores });
    if (room.scores[0] >= 7 || room.scores[1] >= 7) { io.to(roomId).emit('pong-gameover', { scores: room.scores, winner: room.scores[0] >= 7 ? 0 : 1 }); room.state = 'ended'; clearInterval(iv); }
  }, 1000 / 60);
}

// Cleanup
setInterval(() => {
  for (const rooms of [pongRooms, tttRooms, c4Rooms, chessRooms, rpsRooms, snakeRooms, floodRooms]) {
    for (const [id, r] of Object.entries(rooms)) { if (r.state === 'ended' || (r.state === 'waiting' && r.players?.length === 0)) delete rooms[id]; }
  }
}, 300000);

server.listen(PORT, () => {
  console.log(`
  â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
  â•‘   ðŸŒ¿ Glass-Tech Sanctuary 2026 ULTIMATE is LIVE â•‘
  â•‘   â†’ http://localhost:${PORT}                        â•‘
  â•‘   â†’ Myself Teja Priyan â€” Tech Enthusiast         â•‘
  â•‘   â†’ 20 Futuristic Features Loaded!               â•‘
  â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`);
});


