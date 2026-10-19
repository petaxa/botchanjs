const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (request.method !== "GET" || path !== "/internal/health") {
      return json({ error: "not_found" }, 404);
    }

    try {
      const result = await env.DB.prepare("SELECT 1 AS connected").first();
      if (result?.connected !== 1) {
        throw new Error("Unexpected D1 response");
      }
      return json({ ok: true, database: "connected" });
    } catch {
      return json({ error: "database_unavailable" }, 503);
    }
  },
};
