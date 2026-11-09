import { readFile } from "node:fs/promises";
import { encode } from "modern-gif";
import { Miniflare } from "miniflare";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import worker from "./worker";

describe("public gallery API [E6]", () => {
  test.each(["slackmoji.haklee.me", "mojji.haklee.me"])(
    "redirects %s with path and query intact",
    async (host) => {
      const platform = await getPlatformProxy<Parameters<typeof worker.fetch>[1]>({
        persist: false,
      });
      onTestFinished(() => platform.dispose());
      const response = await worker.fetch(
        new Request(`https://${host}/api/mochi?sort=popular`, { method: "POST" }),
        platform.env,
        platform.ctx,
      );
      expect(response.status).toBe(308);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Location")).toBe(
        "https://slackmojji.haklee.me/api/mochi?sort=popular",
      );
      expect(await response.text()).toBe("");
    },
  );
  test("publishes idempotently, paginates, sorts and counts only successful downloads with real D1/R2", async () => {
    const platform = await getPlatformProxy<Parameters<typeof worker.fetch>[1]>({ persist: false });
    onTestFinished(() => platform.dispose());
    await platform.env.DB.batch(
      (await readFile("migrations/0001_gallery.sql", "utf8"))
        .split(";")
        .filter((sql) => sql.trim())
        .map((sql) => platform.env.DB.prepare(sql)),
    );
    await platform.env.DB.prepare("INSERT INTO mochi (id,bytes) VALUES ('legacy',100)").run();
    await platform.env.DB.exec(await readFile("migrations/0002_mochi_filename.sql", "utf8"));
    expect(
      await platform.env.DB.prepare("SELECT filename FROM mochi WHERE id='legacy'").first(
        "filename",
      ),
    ).toBe("slackmoji.gif");
    await platform.env.DB.prepare("DELETE FROM mochi WHERE id='legacy'").run();
    const gif = await encode({
      width: 128,
      height: 128,
      frames: [{ data: new Uint8Array(128 * 128 * 4).fill(255), delay: 60 }],
      format: "arrayBuffer",
    });
    const published = await worker.fetch(
      new Request("https://example.test/api/mochi", {
        method: "POST",
        headers: {
          Origin: "https://example.test",
          "Content-Type": "image/gif",
          "X-Mochi-Filename": encodeURIComponent("../슬랙\n모찌: (♡).gif"),
        },
        body: gif,
      }),
      platform.env,
      platform.ctx,
    );
    expect(published.status).toBe(201);
    expect(await platform.env.DB.prepare("SELECT filename FROM mochi").first("filename")).toBe(
      "슬랙 모찌 (♡).gif",
    );
    const { id } = (await published.json()) as { id: string };
    expect(
      (
        await worker.fetch(
          new Request("https://example.test/api/mochi", {
            method: "POST",
            headers: { Origin: "https://example.test", "Content-Type": "image/gif" },
            body: gif,
          }),
          platform.env,
          platform.ctx,
        )
      ).status,
    ).toBe(201);
    expect(
      await platform.env.DB.prepare("SELECT count(*) AS total FROM mochi").first("total"),
    ).toBe(1);
    const runtime = new Miniflare({
      workers: [
        {
          config: {
            name: "cache",
            compatibilityDate: "2026-11-03",
            cache: { enabled: true },
            manifest: {
              mainModule: "index.js",
              modules: {
                "index.js": {
                  type: "esm",
                  contents: "export default { fetch() { return new Response('ok'); } }",
                },
              },
            },
          },
        },
      ],
    });
    onTestFinished(() => runtime.dispose());
    const runtimeCaches = await runtime.getCaches();
    vi.stubGlobal("caches", runtimeCaches);
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const preview = await worker.fetch(
      new Request(`https://example.test/api/mochi/${id}/image`),
      platform.env,
      platform.ctx,
    );
    expect(new Uint8Array(await preview.arrayBuffer())).toEqual(new Uint8Array(gif));
    expect(preview.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    const cache = await runtimeCaches.open("mochi-images");
    await expect
      .poll(async () => !!(await cache.match(`https://example.test/api/mochi/${id}/image`)))
      .toBe(true);
    await platform.env.MOCHI.delete(`${id}.gif`);
    const cached = await worker.fetch(
      new Request(`https://example.test/api/mochi/${id}/image?ignored=variant`),
      platform.env,
      platform.ctx,
    );
    expect(new Uint8Array(await cached.arrayBuffer())).toEqual(new Uint8Array(gif));
    await platform.env.MOCHI.put(`${id}.gif`, gif);
    vi.stubGlobal("caches", { open: vi.fn().mockRejectedValue(new Error("cache unavailable")) });
    const uncached = await worker.fetch(
      new Request(`https://example.test/api/mochi/${id}/image`),
      platform.env,
      platform.ctx,
    );
    expect(uncached.status).toBe(200);
    expect(new Uint8Array(await uncached.arrayBuffer())).toEqual(new Uint8Array(gif));
    vi.stubGlobal("caches", runtimeCaches);
    const missingUrl = `https://example.test/api/mochi/${"f".repeat(64)}/image`;
    expect((await worker.fetch(new Request(missingUrl), platform.env, platform.ctx)).status).toBe(
      404,
    );
    expect(await cache.match(missingUrl)).toBeUndefined();
    expect(
      await platform.env.DB.prepare("SELECT downloads FROM mochi WHERE id = ?")
        .bind(id)
        .first("downloads"),
    ).toBe(0);
    const downloads = await Promise.all(
      Array.from({ length: 3 }, () =>
        worker.fetch(
          new Request(`https://example.test/api/mochi/${id}/download`, {
            method: "POST",
            headers: { Origin: "https://example.test" },
          }),
          platform.env,
          platform.ctx,
        ),
      ),
    );
    expect(
      downloads.every(
        (response) =>
          response.status === 200 &&
          response.headers.get("Cache-Control") === "no-store" &&
          response.headers.get("Content-Disposition") ===
            "attachment; filename=\"slackmojji.gif\"; filename*=UTF-8''%EC%8A%AC%EB%9E%99%20%EB%AA%A8%EC%B0%8C%20%28%E2%99%A1%29.gif",
      ),
    ).toBe(true);
    expect(
      await platform.env.DB.prepare("SELECT downloads FROM mochi WHERE id = ?")
        .bind(id)
        .first("downloads"),
    ).toBe(3);
    await platform.env.DB.batch(
      Array.from({ length: 25 }, (_, index) =>
        platform.env.DB.prepare("INSERT INTO mochi (id,bytes,created_at) VALUES (?, 100, ?)").bind(
          index.toString(16).padStart(64, "0"),
          2000000000 + index,
        ),
      ),
    );
    const recent = (await (
      await worker.fetch(new Request("https://example.test/api/mochi"), platform.env, platform.ctx)
    ).json()) as { items: { id: string }[]; nextOffset: number };
    expect(recent.items).toHaveLength(24);
    expect(await cache.match("https://example.test/api/mochi")).toBeUndefined();
    expect(recent.nextOffset).toBe(24);
    const popular = (await (
      await worker.fetch(
        new Request("https://example.test/api/mochi?sort=popular"),
        platform.env,
        platform.ctx,
      )
    ).json()) as { items: { id: string; filename: string }[] };
    expect(popular.items[0].id).toBe(id);
    expect(popular.items[0].filename).toBe("슬랙 모찌 (♡).gif");
    expect(
      (
        (await (
          await worker.fetch(
            new Request("https://example.test/api/mochi?offset=24"),
            platform.env,
            platform.ctx,
          )
        ).json()) as { items: unknown[] }
      ).items,
    ).toHaveLength(2);
    await platform.env.MOCHI.delete(`${id}.gif`);
    expect(
      (
        await worker.fetch(
          new Request(`https://example.test/api/mochi/${id}/download`, {
            method: "POST",
            headers: { Origin: "https://example.test" },
          }),
          platform.env,
          platform.ctx,
        )
      ).status,
    ).toBe(404);
    expect(
      await platform.env.DB.prepare("SELECT downloads FROM mochi WHERE id = ?")
        .bind(id)
        .first("downloads"),
    ).toBe(3);
  }, 20000);

  test("rejects cross-origin writes, malformed GIFs and oversized bodies without publishing", async () => {
    const platform = await getPlatformProxy<Parameters<typeof worker.fetch>[1]>({ persist: false });
    onTestFinished(() => platform.dispose());
    for (const [origin, type, body, status] of [
      ["https://evil.test", "image/gif", new Uint8Array(1), 403],
      ["https://example.test", "text/html", new Uint8Array(1), 415],
      ["https://example.test", "image/gif", new Uint8Array(131073), 413],
      ["https://example.test", "image/gif", new TextEncoder().encode("GIF89a;"), 400],
    ] as const) {
      const response = await worker.fetch(
        new Request("https://example.test/api/mochi", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": type },
          body,
        }),
        platform.env,
        platform.ctx,
      );
      expect(response.status).toBe(status);
    }
    const invalidName = await worker.fetch(
      new Request("https://example.test/api/mochi", {
        method: "POST",
        headers: {
          Origin: "https://example.test",
          "Content-Type": "image/gif",
          "X-Mochi-Filename": "%ZZ",
        },
        body: new Uint8Array(1),
      }),
      platform.env,
      platform.ctx,
    );
    expect(invalidName.status).toBe(400);
    expect((await platform.env.MOCHI.list()).objects).toHaveLength(0);
  }, 20000);
});
