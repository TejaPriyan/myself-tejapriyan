// ============================================================
// server.js — Glass-Tech Sanctuary ULTIMATE 2026 Edition
// Myself Teja Priyan — Tech Enthusiast
// ============================================================
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const INFIP_API_KEY = process.env.INFIP_API_KEY;
const DB_PATH = path.join(__dirname, 'database.json');

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch (e) { return { users: {}, gallery: [], chat: [], leaderboard: [], achievements: {}, dailyChallenges: {}, activityFeed: [], tournaments: {} }; }
}
function saveDB(db) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch (e) {}
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, pingTimeout: 60000, pingInterval: 25000 });

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

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

// ── Daily Challenge System ────────────────────────────────────
function getDailyChallenge() {
  const challenges = [
    { id: 'speed-quiz-7', title: '⚡ Speed Demon', desc: 'Score 7+ on Medical Speed Quiz', game: 'speed-quiz', target: 7, xpReward: 50 },
    { id: 'memory-10', title: '🧠 Sharp Mind', desc: 'Complete Neural Memory in under 10 moves', game: 'neural-memory', target: 10, xpReward: 40 },
    { id: 'play-3-games', title: '🎮 Game Explorer', desc: 'Play 3 different games today', game: 'any', target: 3, xpReward: 35 },
    { id: 'stacker-200', title: '🏗️ Sky Builder', desc: 'Reach 200px height in Stacker', game: 'stacker', target: 200, xpReward: 45 },
    { id: 'drug-match-all', title: '💊 Pharmacist', desc: 'Match all drugs correctly', game: 'drug-matcher', target: 6, xpReward: 40 },
    { id: 'wordle-win', title: '📝 Word Wizard', desc: 'Win a Wordle game', game: 'wordle', target: 1, xpReward: 35 },
    { id: 'typing-50wpm', title: '⌨️ Speed Typer', desc: 'Reach 50+ WPM in Typing Race', game: 'typing-race', target: 50, xpReward: 45 },
    { id: 'maze-3', title: '🏃 Maze Master', desc: 'Complete 3 maze levels', game: 'maze', target: 3, xpReward: 40 },
    { id: 'reaction-300', title: '⚡ Lightning', desc: 'Get under 300ms reaction time', game: 'reaction', target: 300, xpReward: 40 },
    { id: 'rhythm-80', title: '🎵 Rhythm King', desc: 'Score 80%+ in Rhythm Game', game: 'rhythm', target: 80, xpReward: 50 },
    { id: 'ecg-5', title: '💓 ECG Expert', desc: 'Identify 5 ECG rhythms correctly', game: 'ecg', target: 5, xpReward: 45 },
    { id: 'tower-10', title: '🏰 Defender', desc: 'Survive 10 waves in Tower Defense', game: 'tower-defense', target: 10, xpReward: 50 },
  ];
  const dayIndex = Math.floor(Date.now() / 86400000) % challenges.length;
  return challenges[dayIndex];
}

// ── Achievement Definitions ───────────────────────────────────
const ACHIEVEMENTS = {
  'first-game': { title: '🎮 First Steps', desc: 'Play your first game', icon: '🎮' },
  'xp-100': { title: '⭐ Rising Star', desc: 'Earn 100 XP', icon: '⭐' },
  'xp-500': { title: '🌟 Shining Bright', desc: 'Earn 500 XP', icon: '🌟' },
  'xp-1000': { title: '💫 Legendary', desc: 'Earn 1000 XP', icon: '💫' },
  'level-5': { title: '🏅 Level 5', desc: 'Reach Level 5', icon: '🏅' },
  'level-10': { title: '🏆 Level 10', desc: 'Reach Level 10', icon: '🏆' },
  'games-10': { title: '🎯 Dedicated', desc: 'Play 10 games total', icon: '🎯' },
  'games-50': { title: '🔥 On Fire', desc: 'Play 50 games total', icon: '🔥' },
  'quiz-master': { title: '🧠 Quiz Master', desc: 'Score 10/10 on Speed Quiz', icon: '🧠' },
  'memory-master': { title: '🃏 Memory Master', desc: 'Complete memory in under 12 moves', icon: '🃏' },
  'daily-complete': { title: '📅 Daily Warrior', desc: 'Complete a daily challenge', icon: '📅' },
  'image-creator': { title: '🎨 Artist', desc: 'Generate 5 images', icon: '🎨' },
  'chat-10': { title: '💬 Talkative', desc: 'Send 10 messages to Ami', icon: '💬' },
  'all-zones': { title: '🗺️ Explorer', desc: 'Visit all zones', icon: '🗺️' },
  'pong-win': { title: '🏓 Pong Champ', desc: 'Win a Pong game', icon: '🏓' },
  'chess-win': { title: '♟️ Chess Master', desc: 'Win a chess game', icon: '♟️' },
  'wordle-win': { title: '📝 Wordsmith', desc: 'Complete a Wordle', icon: '📝' },
  'rhythm-king': { title: '🎵 Rhythm King', desc: 'Score 90%+ in Rhythm Game', icon: '🎵' },
  'maze-runner': { title: '🏃 Maze Runner', desc: 'Complete 5 maze levels', icon: '🏃' },
  'ecg-expert': { title: '💓 ECG Expert', desc: 'Identify 10 ECG rhythms', icon: '💓' },
  'tower-hero': { title: '🏰 Tower Hero', desc: 'Survive 15 waves', icon: '🏰' },
  'social-butterfly': { title: '🦋 Social Butterfly', desc: 'Send 20 global chat messages', icon: '🦋' },
};

// ── API Routes ───────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── Image Generation ──────────────────────────────────────────
app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });
  try {
    const cleanPrompt = prompt.trim();
    let imageUrl = null;
    if (INFIP_API_KEY && INFIP_API_KEY.trim()) {
      try {
        const r = await fetch('https://api.infip.pro/v1/images/generations', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${INFIP_API_KEY}` },
          body: JSON.stringify({ model: 'img3', prompt: cleanPrompt, n: 1, size: '1024x1024', response_format: 'url' })
        });
        if (r.ok) {
          const d = await r.json();
          if (d.task_id) {
            let att = 0;
            while (att < 15 && !imageUrl) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              try {
                const pr = await fetch(`https://api.infip.pro/v1/tasks/${d.task_id}`, { headers: { 'Authorization': `Bearer ${INFIP_API_KEY}` } });
                if (pr.ok) { const pd = await pr.json(); if (pd.status === 'completed' && pd.data) { imageUrl = pd.data[0]?.url; break; } else if (pd.status === 'failed') break; }
              } catch (e) {}
              att++;
            }
          } else if (d.data?.length > 0) imageUrl = d.data[0].url;
        }
      } catch (e) { console.log('[IMG] INFIP failed:', e.message); }
    }
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 999999);
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
    }
    const db = loadDB();
    const entry = { id: Date.now().toString(), prompt: cleanPrompt, url: imageUrl, createdAt: new Date().toISOString() };
    db.gallery.unshift(entry);
    if (db.gallery.length > 100) db.gallery = db.gallery.slice(0, 100);
    saveDB(db);
    res.json({ success: true, url: imageUrl, entry });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/gallery', (req, res) => { res.json((loadDB().gallery || []).slice(0, 20)); });

// ── Chat ─────────────────────────────────────────────────────
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
      { role: 'user', content: systemPrompt },
      { role: 'assistant', content: 'Understood. I am Ami, ready to assist. 🌿' }
    ];
    const db = loadDB();
    const mem = db.users?.[userId]?.amiMemory || [];
    for (const m of mem.slice(-5)) messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
    if (history?.length) for (const h of history.slice(-8)) messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text });
    messages.push({ role: 'user', content: message });

    // Try multiple free models in order — if one is rate-limited, fall to next
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
            'HTTP-Referer': 'http://localhost:3000',
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
    res.json({ reply: "🌿 I'm having a little trouble connecting to my brain right now. But don't worry — I'm still here! Want to play a game or explore the Sanctuary? 🌟" });
  }
});

// ── User XP ───────────────────────────────────────────────────
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
    id, xp: u.xp || 0, level: u.level || 1, username: u.username || id.slice(0, 10), avatar: u.avatar || '🧑‍💻',
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

// ── Socket.io ────────────────────────────────────────────────
const pongRooms = {}, tttRooms = {}, c4Rooms = {}, chessRooms = {};
let onlineUsers = new Set();

io.on('connection', (socket) => {
  onlineUsers.add(socket.id);
  io.emit('online-count', onlineUsers.size);

  socket.on('set-user', (data) => { socket.userId = data.userId; socket.username = data.username; });

  // ── Global Chat ──────────────────────────────────────────
  socket.on('global-chat', (data) => {
    const msg = { id: Date.now().toString(), oderId: data.userId, username: data.username || 'Anon', text: (data.text || '').slice(0, 500), timestamp: new Date().toISOString(), reactions: {} };
    io.emit('global-chat', msg);
    const db = loadDB();
    db.chat.push(msg);
    if (db.chat.length > 200) db.chat = db.chat.slice(-100);
    if (db.users[data.userId]) { db.users[data.userId].globalChats = (db.users[data.userId].globalChats || 0) + 1; }
    saveDB(db);
  });

  // ── Chat Reactions ───────────────────────────────────────
  socket.on('chat-reaction', (data) => { io.emit('chat-reaction', data); });

  // ── Canvas ───────────────────────────────────────────────
  socket.on('canvas-draw', (data) => socket.broadcast.emit('canvas-draw', data));
  socket.on('canvas-clear', () => io.emit('canvas-clear'));

  // ── Pong ─────────────────────────────────────────────────
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

  // ── TTT ──────────────────────────────────────────────────
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

  // ── C4 ───────────────────────────────────────────────────
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

  // ── Chess ────────────────────────────────────────────────
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

  // ── Disconnect ───────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('online-count', onlineUsers.size);
    if (socket.pongRoom && pongRooms[socket.pongRoom]) { const r = pongRooms[socket.pongRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete pongRooms[socket.pongRoom]; else { r.state = 'ended'; io.to(socket.pongRoom).emit('pong-opponent-left'); } }
    if (socket.tttRoom && tttRooms[socket.tttRoom]) { const r = tttRooms[socket.tttRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete tttRooms[socket.tttRoom]; else io.to(socket.tttRoom).emit('ttt-opponent-left'); }
    if (socket.c4Room && c4Rooms[socket.c4Room]) { const r = c4Rooms[socket.c4Room]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete c4Rooms[socket.c4Room]; else io.to(socket.c4Room).emit('c4-opponent-left'); }
    if (socket.chessRoom && chessRooms[socket.chessRoom]) { const r = chessRooms[socket.chessRoom]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) delete chessRooms[socket.chessRoom]; else io.to(socket.chessRoom).emit('chess-opponent-left'); }
  });
});

// ── Pong Loop ────────────────────────────────────────────────
function startPongLoop(roomId) {
  const iv = setInterval(() => {
    const room = pongRooms[roomId];
    if (!room || room.state !== 'playing' || room.players.length < 2) { clearInterval(iv); return; }
    const b = room.ball;
    b.x += b.vx; b.y += b.vy;
    if (b.y <= 10 || b.y >= 590) b.vy *= -1;
    const p0 = room.players[0], p1 = room.players[1];
    if (b.x <= 30 && b.x >= 20 && b.y >= p0.y && b.y <= p0.y + 100) { b.vx = Math.abs(b.vx) * 1.05; b.vy += (Math.random() - 0.5) * 2; }
    if (b.x >= 770 && b.x <= 780 && b.y >= p1.y && b.y <= p1.y + 100) { b.vx = -Math.abs(b.vx) * 1.05; b.vy += (Math.random() - 0.5) * 2; }
    if (b.x < 0) { room.scores[1]++; Object.assign(b, { x: 400, y: 300, vx: 4, vy: (Math.random() - 0.5) * 6 }); }
    else if (b.x > 800) { room.scores[0]++; Object.assign(b, { x: 400, y: 300, vx: -4, vy: (Math.random() - 0.5) * 6 }); }
    b.vx = Math.max(-12, Math.min(12, b.vx)); b.vy = Math.max(-8, Math.min(8, b.vy));
    io.to(roomId).emit('pong-state', { ball: { x: b.x, y: b.y }, paddles: [p0.y, p1.y], scores: room.scores });
    if (room.scores[0] >= 7 || room.scores[1] >= 7) { io.to(roomId).emit('pong-gameover', { scores: room.scores, winner: room.scores[0] >= 7 ? 0 : 1 }); room.state = 'ended'; clearInterval(iv); }
  }, 1000 / 60);
}

// Cleanup
setInterval(() => {
  for (const rooms of [pongRooms, tttRooms, c4Rooms, chessRooms]) {
    for (const [id, r] of Object.entries(rooms)) { if (r.state === 'ended' || (r.state === 'waiting' && r.players?.length === 0)) delete rooms[id]; }
  }
}, 300000);

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   🌿 Glass-Tech Sanctuary 2026 ULTIMATE is LIVE ║
  ║   → http://localhost:${PORT}                        ║
  ║   → Myself Teja Priyan — Tech Enthusiast         ║
  ║   → 20 Futuristic Features Loaded!               ║
  ╚══════════════════════════════════════════════════╝`);
});