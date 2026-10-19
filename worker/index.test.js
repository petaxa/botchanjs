import { describe, expect, it, vi } from "vite-plus/test";
import worker from "./index.js";

const request = (path = "/internal/health", method = "GET") =>
  new Request(`https://worker.example${path}`, { method });

describe("stock game Worker", () => {
  it("checks the D1 binding before reporting healthy", async () => {
    const first = vi.fn().mockResolvedValue({ connected: 1 });
    const prepare = vi.fn().mockReturnValue({ first });
    const response = await worker.fetch(request(), { DB: { prepare } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, database: "connected" });
    expect(prepare).toHaveBeenCalledWith("SELECT 1 AS connected");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("fails closed when D1 is unavailable", async () => {
    const response = await worker.fetch(request(), {
      DB: { prepare: () => ({ first: () => Promise.reject(new Error("D1 failed")) }) },
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "database_unavailable" });
  });

  it("does not expose other routes or methods", async () => {
    const env = { DB: { prepare: vi.fn() } };
    expect((await worker.fetch(request("/missing"), env)).status).toBe(404);
    expect((await worker.fetch(request("/internal/health", "POST"), env)).status).toBe(404);
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });
});
