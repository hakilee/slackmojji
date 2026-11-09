import { createServer } from "vite";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";
import { gzipSync } from "node:zlib";

// Native feasibility measurements, not a browser/mobile acceptance benchmark.
const server = await createServer({ logLevel: "silent", server: { middlewareMode: true } });
try {
  const { drawEmoji, exportGif, initialSettings, initialTextLayer } =
    await server.ssrLoadModule("/src/lib/emoji.ts");
  if (
    !GlobalFonts.registerFromPath(
      "node_modules/pretendard/dist/public/static/Pretendard-Regular.otf",
      "Pretendard",
    )
  )
    throw new Error("Unable to register the benchmark font");
  const results = [];
  for (const [name, count, motion] of [
    ["static", 1, "none"],
    ["single", 1, "bounce"],
    ["four-layers", 4, "jelly"],
    ["twelve-layers", 12, "roll"],
  ]) {
    const settings = {
      ...initialSettings,
      transparent: true,
      motion,
      layers: Array.from({ length: count }, (_, i) => ({
        ...initialTextLayer,
        id: `text-${i}`,
        font: "Pretendard",
        text: count === 1 ? "슬랙\n모찌" : `텍스트 ${i + 1}\n모찌 테스트`,
        scale: count === 1 ? 1 : 0.35,
        x: 25 + i * 7,
        y: 25 + i * 7,
      })),
    };
    const json = Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        rendererVersion: 1,
        fontVersion: "pretendard@1.3.9",
        settings,
      }),
    );
    const ctx = createCanvas(128, 128).getContext("2d");
    const encodeTimes = [];
    let gif;
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      gif = Buffer.from(await (await exportGif(ctx, settings)).arrayBuffer());
      encodeTimes.push(performance.now() - start);
    }
    const webp = await sharp(gif, { animated: true })
      .webp({ lossless: true, effort: 6 })
      .toBuffer();
    const input = await sharp(gif, { animated: true }).metadata();
    const output = await sharp(webp, { animated: true }).metadata();
    const contexts = Array.from({ length: 24 }, () => createCanvas(128, 128).getContext("2d"));
    for (const context of contexts) drawEmoji(context, settings, 0);
    const frameTimes = [];
    for (let frame = 0; frame < 60; frame++) {
      const start = performance.now();
      for (const context of contexts) drawEmoji(context, settings, (frame % 20) / 20);
      frameTimes.push(performance.now() - start);
    }
    frameTimes.sort((a, b) => a - b);
    const layouts = contexts.map(() => new Map());
    contexts.forEach((context, index) => drawEmoji(context, settings, 0, layouts[index]));
    const cachedFrameTimes = [];
    for (let frame = 0; frame < 60; frame++) {
      const start = performance.now();
      contexts.forEach((context, index) =>
        drawEmoji(context, settings, (frame % 20) / 20, layouts[index]),
      );
      cachedFrameTimes.push(performance.now() - start);
    }
    cachedFrameTimes.sort((a, b) => a - b);
    encodeTimes.sort((a, b) => a - b);
    results.push({
      name,
      layers: count,
      motion,
      jsonBytes: json.length,
      gzipJsonBytes: gzipSync(json).length,
      gifBytes: gif.length,
      losslessWebpBytes: webp.length,
      gifEncodeMedianMs: +encodeTimes[1].toFixed(2),
      draw24MedianMs: +frameTimes[30].toFixed(2),
      draw24P95Ms: +frameTimes[57].toFixed(2),
      draw24CachedP95Ms: +cachedFrameTimes[57].toFixed(2),
      inputFrames: input.pages ?? 1,
      outputFrames: output.pages ?? 1,
      inputDurationMs: input.delay?.reduce((a, b) => a + b, 0),
      outputDurationMs: output.delay?.reduce((a, b) => a + b, 0),
    });
  }
  console.log(
    JSON.stringify(
      {
        runtime: process.version,
        renderer: "@napi-rs/canvas (native)",
        samples: "3 encodes, 60 warm 24-canvas batches; excludes font transfer/browser paint",
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
