/**
 * Cloudflare Worker — Oref API Proxy
 * Forwards requests to pikud haoref with correct headers,
 * and adds CORS headers so any browser can access it.
 */

const OREF_HEADERS = {
  "Referer": "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const ALLOWED_PATHS = {
  "/active":  "https://www.oref.org.il/WarningMessages/alert/alerts.json",
  "/history": "https://www.oref.org.il/WarningMessages/History/AlertsHistory.json",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json;charset=UTF-8",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const target = ALLOWED_PATHS[url.pathname];
    if (!target) {
      return new Response(JSON.stringify({ error: "Not found. Use /active or /history" }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    try {
      const res = await fetch(target, {
        headers: OREF_HEADERS,
        cf: { cacheTtl: 5 }, // cache 5 seconds on Cloudflare edge
      });

      const text = await res.text();

      // Oref sometimes returns empty string for "no active alerts"
      const body = text.trim() === "" ? "[]" : text;

      return new Response(body, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: CORS_HEADERS,
      });
    }
  },
};
