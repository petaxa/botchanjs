import { createHash, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

const MAX_BODY_BYTES = 16 * 1024;

interface JsonPostOptions<T> {
  path: string;
  tokenEnv: string;
  parse(body: unknown): T | undefined;
  publish(value: T): Promise<void>;
}

interface Route {
  path: string;
  tokenEnv: string;
  handle(body: unknown): Promise<boolean>;
}

interface ActiveRoute extends Route {
  token: string;
}

class RequestError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super(`Invalid JSON request: ${statusCode}`);
    this.statusCode = statusCode;
  }
}

function respond(response: ServerResponse, statusCode: number): void {
  response.writeHead(statusCode, { "Cache-Control": "no-store" }).end();
}

function isAuthorized(header: string | undefined, token: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;

  const actual = createHash("sha256").update(header.slice(7)).digest();
  const expected = createHash("sha256").update(token).digest();
  return timingSafeEqual(actual, expected);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new RequestError(413);
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400);
  }
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  routes: readonly ActiveRoute[],
): Promise<void> {
  const route = routes.find((candidate): boolean => candidate.path === request.url);
  if (!route) {
    respond(response, 404);
    return;
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    respond(response, 405);
    return;
  }
  if (!isAuthorized(request.headers.authorization, route.token)) {
    respond(response, 401);
    return;
  }
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    respond(response, 415);
    return;
  }

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    respond(response, error instanceof RequestError ? error.statusCode : 400);
    return;
  }

  try {
    respond(response, (await route.handle(body)) ? 204 : 400);
  } catch (error) {
    console.error("HTTP webhook handler failed", error);
    respond(response, 502);
  }
}

export class HttpService {
  private readonly routes: Route[] = [];
  private server: Server | undefined;

  registerJsonPost<T>(options: JsonPostOptions<T>): void {
    if (this.routes.some((route): boolean => route.path === options.path)) {
      throw new Error(`HTTP route already registered: ${options.path}`);
    }

    this.routes.push({
      path: options.path,
      tokenEnv: options.tokenEnv,
      async handle(body: unknown): Promise<boolean> {
        const value = options.parse(body);
        if (value === undefined) return false;
        await options.publish(value);
        return true;
      },
    });
  }

  async start(): Promise<void> {
    if (this.server) return;

    const routes: ActiveRoute[] = [];
    for (const route of this.routes) {
      const token = process.env[route.tokenEnv];
      if (token) routes.push({ ...route, token });
    }
    if (routes.length === 0) return;

    const port = Number(process.env.PORT ?? 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("PORT must be an integer between 1 and 65535");
    }

    const server = createServer((request, response): void => {
      void handleRequest(request, response, routes).catch((error: unknown): void => {
        console.error("HTTP webhook failed", error);
        if (!response.headersSent) respond(response, 500);
        else response.end();
      });
    });
    server.listen(port, "0.0.0.0");
    await once(server, "listening");
    this.server = server;
    console.info(`HTTP webhook listening on port ${port}`);
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = undefined;

    await new Promise<void>((resolve, reject): void => {
      server.close((error): void => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
