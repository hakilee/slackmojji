import type { D1Database, ExecutionContext, R2Bucket, RateLimit } from "@cloudflare/workers-types";
import { formatDownloadFilename } from "../lib/download-filename";
import { validateGif } from "./validate-gif";
import { maxRecipeBytes, recipeSchema } from "../lib/mochi-recipe";

interface Env {
  ASSETS: { fetch: typeof fetch };
  DB: D1Database;
  MOCHI: R2Bucket;
  PUBLISH_LIMIT: RateLimit;
  DOWNLOAD_LIMIT: RateLimit;
  ENABLE_MOCHI_RECIPES?: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    context: Pick<ExecutionContext, "waitUntil">,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (["slackmoji.haklee.me", "mojji.haklee.me"].includes(url.hostname)) {
      url.protocol = "https:";
      url.host = "slackmojji.haklee.me";
      return new Response(null, {
        status: 308,
        headers: { Location: url.toString(), "Cache-Control": "no-store" },
      });
    }
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
    const error = (message: string, status: number) =>
      Response.json({ error: message }, { status, headers });
    try {
      if (url.pathname === "/api/mochi" && request.method === "GET") {
        const sort = url.searchParams.get("sort") ?? "recent";
        const offset = Number(url.searchParams.get("offset") ?? 0);
        if (
          !["recent", "popular"].includes(sort) ||
          !Number.isSafeInteger(offset) ||
          offset < 0 ||
          offset > 10000
        )
          return error("목록 요청이 올바르지 않아요.", 400);
        const order =
          sort === "popular"
            ? "downloads DESC, created_at DESC, id DESC"
            : "created_at DESC, id DESC";
        const { results } = await env.DB.prepare(
          `SELECT id, created_at, downloads, filename, recipe FROM mochi ORDER BY ${order} LIMIT 25 OFFSET ?`,
        )
          .bind(offset)
          .all();
        return Response.json(
          {
            items: results.slice(0, 24).map((item) => ({
              ...item,
              recipe: typeof item.recipe === "string" ? JSON.parse(item.recipe) : null,
            })),
            nextOffset: results.length > 24 ? offset + 24 : null,
          },
          { headers },
        );
      }
      const match = url.pathname.match(
        /^\/api\/mochi\/(?<id>[a-f0-9]{64})\/(?<action>image|download|count)$/,
      );
      if (match?.groups && request.method === "GET" && match.groups.action === "image") {
        const cache = await caches.open("mochi-images").catch(() => undefined);
        const cacheKey = new Request(new URL(url.pathname, url.origin));
        const cached = await cache?.match(cacheKey).catch(() => undefined);
        if (cached) return cached;
        const exists = await env.DB.prepare("SELECT id FROM mochi WHERE id = ?")
          .bind(match.groups.id)
          .first();
        if (!exists) return error("모찌를 찾을 수 없어요.", 404);
        const object = await env.MOCHI.get(`${match.groups.id}.gif`);
        if (!object) return error("모찌를 찾을 수 없어요.", 404);
        const response = new Response(object.body as unknown as ReadableStream<Uint8Array>, {
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
        if (cache) context.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
        return response;
      }
      if (request.method !== "POST") return error("지원하지 않는 요청이에요.", 404);
      if (request.headers.get("Origin") !== url.origin)
        return error("허용되지 않은 요청이에요.", 403);
      const ip = request.headers.get("CF-Connecting-IP") ?? "local";
      if (match?.groups?.action === "count") {
        if (!(await env.DOWNLOAD_LIMIT.limit({ key: ip })).success)
          return error("잠시 후 다시 다운로드해 주세요.", 429);
        const row = await env.DB.prepare(
          "UPDATE mochi SET downloads = downloads + 1 WHERE id = ? AND recipe IS NOT NULL RETURNING downloads",
        )
          .bind(match.groups.id)
          .first();
        return row ? Response.json(row, { headers }) : error("설정 모찌를 찾을 수 없어요.", 404);
      }
      if (match?.groups?.action === "download") {
        if (!(await env.DOWNLOAD_LIMIT.limit({ key: ip })).success)
          return error("잠시 후 다시 다운로드해 주세요.", 429);
        const object = await env.MOCHI.get(`${match.groups.id}.gif`);
        if (!object) return error("모찌를 찾을 수 없어요.", 404);
        const content = await object.arrayBuffer();
        const row = await env.DB.prepare(
          "UPDATE mochi SET downloads = downloads + 1 WHERE id = ? RETURNING downloads, filename",
        )
          .bind(match.groups.id)
          .first<{ downloads: number; filename: string }>();
        if (!row) return error("모찌를 찾을 수 없어요.", 404);
        return new Response(content, {
          headers: {
            ...headers,
            "Content-Type": "image/gif",
            "Content-Disposition": `attachment; filename="slackmojji.gif"; filename*=UTF-8''${encodeURIComponent(row.filename).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`,
          },
        });
      }
      if (url.pathname !== "/api/mochi") return error("모찌를 찾을 수 없어요.", 404);
      if (!(await env.PUBLISH_LIMIT.limit({ key: ip })).success)
        return error("잠시 후 다시 공개해 주세요.", 429);
      const isRecipe = request.headers.get("Content-Type") === "application/json";
      if (isRecipe && env.ENABLE_MOCHI_RECIPES !== "true")
        return error("설정 모찌 공개가 활성화되지 않았어요.", 415);
      if (!isRecipe && request.headers.get("Content-Type") !== "image/gif")
        return error("GIF 파일만 공개할 수 있어요.", 415);
      const limit = isRecipe ? maxRecipeBytes : 131072;
      if (Number(request.headers.get("Content-Length")) > limit)
        return error("공개할 파일의 용량을 줄여 주세요.", 413);
      let filename: string;
      try {
        filename = formatDownloadFilename(
          decodeURIComponent(request.headers.get("X-Mochi-Filename") ?? "").replace(/\.gif$/i, ""),
          "gif",
        );
      } catch {
        return error("파일 이름이 올바르지 않아요.", 400);
      }
      const reader = request.body?.getReader();
      if (!reader) return error("GIF가 비어 있어요.", 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) {
          await reader.cancel();
          return error(
            isRecipe ? "16KB 이하 설정만 공개할 수 있어요." : "128KB 이하 GIF만 공개할 수 있어요.",
            413,
          );
        }
        chunks.push(value);
      }
      let bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      let recipe: string | null = null;
      try {
        if (isRecipe) {
          recipe = JSON.stringify(
            recipeSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))),
          );
          bytes = new TextEncoder().encode(recipe);
          size = bytes.length;
          if (size > maxRecipeBytes) return error("설정 파일의 용량을 줄여 주세요.", 413);
        } else validateGif(bytes);
      } catch {
        return error(
          isRecipe
            ? "지원하는 텍스트 설정만 공개할 수 있어요."
            : "올바른 128×128 GIF만 공개할 수 있어요.",
          400,
        );
      }
      const id = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      if (!isRecipe)
        await env.MOCHI.put(`${id}.gif`, bytes, { httpMetadata: { contentType: "image/gif" } });
      await env.DB.prepare(
        "INSERT INTO mochi (id, bytes, filename, recipe) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
      )
        .bind(id, size, filename, recipe)
        .run();
      return Response.json({ id }, { status: 201, headers });
    } catch {
      return error("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.", 503);
    }
  },
};
