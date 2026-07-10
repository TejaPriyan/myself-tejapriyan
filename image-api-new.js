// ============================================================
// IMAGE GENERATION
// Priority: Magnific Flux 2 Pro → Cloudflare Worker → Pollinations
// ============================================================

const MAGNIFIC_API_KEY = process.env.MAGNIFIC_API_KEY || '';
const MAGNIFIC_BASE    = 'https://api.magnific.com';

const CF_API_URL = process.env.CF_IMAGE_API_URL || '';
const CF_API_KEY = process.env.CF_IMAGE_API_KEY || '';

// ── Helper: poll a Magnific task until COMPLETED or timeout ──
async function pollMagnificTask(taskId, maxWaitMs = 60000) {
  const endpoint = `${MAGNIFIC_BASE}/v1/ai/text-to-image/flux-2-pro/${taskId}`;
  const start    = Date.now();
  const interval = 3000;

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, interval));

    try {
      const res = await fetch(endpoint, {
        headers: { 'x-magnific-api-key': MAGNIFIC_API_KEY }
      });

      if (!res.ok) {
        console.log(`[MAGNIFIC] Poll HTTP ${res.status}`);
        continue;
      }

      const body = await res.json();
      const data  = body.data || body;
      const status = (data.status || '').toUpperCase();

      console.log(`[MAGNIFIC] Task ${taskId} status: ${status}`);

      if (status === 'COMPLETED' || status === 'SUCCESS') {
        // Magnific returns: data.generated = ["https://..."] (array of strings)
        const url =
          (Array.isArray(data.generated) && typeof data.generated[0] === 'string' && data.generated[0]) ||
          (Array.isArray(data.generated) && data.generated[0]?.url) ||
          data.output_url  ||
          data.image_url   ||
          data.url         ||
          data.result?.url ||
          (Array.isArray(data.images) && data.images[0]) ||
          null;
        return url;
      }

      if (status === 'FAILED' || status === 'ERROR') {
        console.log('[MAGNIFIC] Task failed:', JSON.stringify(data).slice(0, 200));
        return null;
      }

      // CREATED / PROCESSING / QUEUED — keep polling
    } catch (e) {
      console.log('[MAGNIFIC] Poll error:', e.message);
    }
  }

  console.log('[MAGNIFIC] Timed out after', maxWaitMs / 1000, 's');
  return null;
}

// ── API 1: Magnific Flux 2 Pro (Primary) ─────────────────────
async function tryMagnific(prompt) {
  try {
    console.log('[IMG] 🟣 Trying Magnific Flux 2 Pro...');
    const res = await fetch(`${MAGNIFIC_BASE}/v1/ai/text-to-image/flux-2-pro`, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-magnific-api-key': MAGNIFIC_API_KEY
      },
      body: JSON.stringify({
        prompt,
        width:  1024,
        height: 1024,
        prompt_upsampling: false
      })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.log(`[MAGNIFIC] POST HTTP ${res.status}: ${err.slice(0, 150)}`);
      return null;
    }

    const body = await res.json();
    const data  = body.data || body;
    const taskId = data.task_id;

    if (!taskId) {
      console.log('[MAGNIFIC] No task_id in response:', JSON.stringify(body).slice(0, 200));
      return null;
    }

    console.log(`[MAGNIFIC] Task created: ${taskId}`);
    const imageUrl = await pollMagnificTask(taskId);

    if (imageUrl) {
      console.log('[IMG] ✅ Magnific success! URL:', imageUrl.slice(0, 80));
      return { imageUrl, usedAPI: 'Magnific-Flux2Pro', isBase64: false };
    }

    return null;
  } catch (e) {
    console.log('[IMG] Magnific error:', e.message);
    return null;
  }
}

// ── API 2: Cloudflare Worker (Fallback) ──────────────────────
async function tryCloudflare(prompt) {
  try {
    console.log('[IMG] 🔵 Trying Cloudflare Worker...');
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 35000);

    const res = await fetch(CF_API_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_KEY}`,
        'Content-Type':  'application/json'
      },
      body:   JSON.stringify({ prompt }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.log(`[IMG] Cloudflare HTTP ${res.status}: ${errText.slice(0, 100)}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('image') || contentType.includes('octet-stream') || contentType.includes('binary')) {
      const buffer  = await res.arrayBuffer();
      const base64  = Buffer.from(buffer).toString('base64');
      const mimeType =
        contentType.includes('png')  ? 'image/png'  :
        contentType.includes('webp') ? 'image/webp' : 'image/jpeg';
      const imageUrl = `data:${mimeType};base64,${base64}`;
      console.log('[IMG] ✅ Cloudflare success! (base64, size:', Math.round(base64.length / 1024), 'KB)');
      return { imageUrl, usedAPI: 'Cloudflare-Worker', isBase64: true };
    }

    // JSON url response
    try {
      const data = await res.json();
      if (data.url || data.image_url) {
        console.log('[IMG] ✅ Cloudflare (JSON URL) success!');
        return { imageUrl: data.url || data.image_url, usedAPI: 'Cloudflare-Worker', isBase64: false };
      }
      console.log('[IMG] Cloudflare unexpected JSON:', JSON.stringify(data).slice(0, 100));
    } catch (_) {
      console.log('[IMG] Cloudflare unexpected content-type:', contentType);
    }

    return null;
  } catch (e) {
    console.log('[IMG] Cloudflare error:', e.message);
    return null;
  }
}

// ── API 3: Pollinations (Last resort) ────────────────────────
function pollinationsFallback(prompt) {
  const seed         = Math.floor(Math.random() * 999999);
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const imageUrl     = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
  console.log('[IMG] 🔴 Using Pollinations Direct URL (last resort)...');
  return { imageUrl, usedAPI: 'Pollinations-Direct', isBase64: false };
}

// ── Main export ───────────────────────────────────────────────
async function generateImageMultiAPI(prompt) {
  const cleanPrompt = prompt.trim();

  // 1. Try Magnific Flux 2 Pro
  const magnific = await tryMagnific(cleanPrompt);
  if (magnific) return magnific;

  // 2. Try Cloudflare Worker
  const cf = await tryCloudflare(cleanPrompt);
  if (cf) return cf;

  // 3. Pollinations as absolute fallback
  return pollinationsFallback(cleanPrompt);
}

module.exports = { generateImageMultiAPI };
