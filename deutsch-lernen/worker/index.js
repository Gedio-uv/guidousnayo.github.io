/**
 * Cloudflare Worker — DeutschLernen API Proxy
 * Proxies requests from the GitHub Pages app to Groq.
 * The API key is stored as a secret env variable (never in code).
 *
 * Allowed origin: https://gedio-uv.github.io
 */

const ALLOWED_ORIGIN = 'https://gedio-uv.github.io';
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions';

export default {
  async fetch(request, env) {

    const origin = request.headers.get('Origin') || '';

    // ── CORS preflight ──
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin);
    }

    // ── Only accept POST to /api/chat ──
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/api/chat') {
      return corsResponse(JSON.stringify({ error: 'Not found' }), 404, origin);
    }

    // ── Parse incoming body ──
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400, origin);
    }

    // ── Forward to Groq ──
    const groqRes = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.GROQ_KEY}`,
      },
      body: JSON.stringify({
        model:           body.model           || 'llama-3.3-70b-versatile',
        messages:        body.messages        || [],
        temperature:     body.temperature     ?? 0.3,
        max_tokens:      body.max_tokens      ?? 1024,
        response_format: body.response_format || { type: 'json_object' },
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const status = groqRes.status === 401 ? 401 : 500;
      return corsResponse(JSON.stringify(data), status, origin);
    }

    return corsResponse(JSON.stringify(data), 200, origin);
  },
};

// ── Helper: build response with CORS headers ──
function corsResponse(body, status, origin) {
  const headers = {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
  return new Response(body, { status, headers });
}
