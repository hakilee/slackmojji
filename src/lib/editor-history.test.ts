import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, test } from "vitest";
import { editorHistoryReducer, initialEditorHistory } from "./editor-history";
import { drawEmoji, initialSettings, initialTextLayer, type ImageLayer } from "./emoji";

describe("editor history [E2b E5v]", () => {
  test("restores background gradients and ignores equal gradient changes [E5bc]", () => {
    const gradient = editorHistoryReducer(initialEditorHistory, {
      type: "change",
      patch: {
        background: "#ff0000",
        backgroundGradient: { end: "#0000ff", direction: "horizontal" },
      },
    });
    expect(
      editorHistoryReducer(gradient, {
        type: "change",
        patch: { backgroundGradient: { end: "#0000ff", direction: "horizontal" } },
      }),
    ).toBe(gradient);
    let history = editorHistoryReducer(gradient, {
      type: "change",
      patch: { backgroundGradient: { end: "#22c55e", direction: "diamond" } },
    });
    const changed = history.present;
    history = editorHistoryReducer(history, { type: "change", patch: { transparent: true } });
    expect(history.present.settings.backgroundGradient).toEqual(
      changed.settings.backgroundGradient,
    );
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present).toEqual(changed);
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present).toEqual(gradient.present);
    history = editorHistoryReducer(history, { type: "redo" });
    expect(history.present).toEqual(changed);
    history = editorHistoryReducer(history, {
      type: "change",
      patch: { backgroundGradient: undefined },
    });
    expect(history.present.settings.backgroundGradient).toBeUndefined();
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present).toEqual(changed);
  });
  test("groups line spacing changes and restores independent layers [E5as]", () => {
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "add-text",
      layer: { ...initialTextLayer, id: "second", text: "두\n줄" },
    });
    const before = history;
    expect(before.present.settings.layers[1]).toMatchObject({ lineHeight: 85 });
    history = editorHistoryReducer(history, { type: "begin-group", group: "pointer" });
    for (const lineHeight of [120, 150, 200]) {
      history = editorHistoryReducer(history, {
        type: "change-text",
        id: "second",
        patch: { lineHeight },
      });
    }
    history = editorHistoryReducer(history, { type: "end-group", group: "pointer" });
    expect(history.past).toHaveLength(before.past.length + 1);
    expect(history.present.settings.layers[0]).toEqual(initialTextLayer);
    const after = history.present;
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present).toEqual(before.present);
    history = editorHistoryReducer(history, { type: "redo" });
    expect(history.present).toEqual(after);
  });

  test.each(["text", "image"] as const)(
    "undoes a complete %s resize atomically and preserves rendering/resources [E5am]",
    (type) => {
      const source = createCanvas(32, 16);
      source.getContext("2d").fillRect(0, 0, 32, 16);
      const layer =
        type === "text"
          ? { ...initialTextLayer, id: "resized", scale: 0.6 }
          : {
              type: "image" as const,
              id: "resized",
              name: "rectangle.png",
              source: source as unknown as HTMLCanvasElement,
              aspectRatio: 2,
              x: 64,
              y: 64,
              size: 64,
              rotation: 45,
              fit: "contain" as const,
            };
      let history = editorHistoryReducer(initialEditorHistory, {
        type: "change",
        patch: { layers: [layer] },
      });
      history = editorHistoryReducer(history, { type: "select", id: layer.id });
      const before = history;
      const ctx = createCanvas(128, 128).getContext("2d") as unknown as CanvasRenderingContext2D;
      drawEmoji(ctx, before.present.settings, 0);
      const beforePixels = ctx.getImageData(0, 0, 128, 128).data;

      history = editorHistoryReducer(history, { type: "begin-group", group: "pointer" });
      for (const offset of [1, 5, 10])
        history = editorHistoryReducer(
          history,
          type === "text"
            ? {
                type: "change-text",
                id: layer.id,
                patch: { x: 64 + offset, y: 64 + offset / 2, scale: 0.6 + offset / 100 },
              }
            : {
                type: "change-image",
                id: layer.id,
                patch: { x: 64 + offset, y: 64 + offset / 2, size: 64 + offset },
              },
        );
      history = editorHistoryReducer(history, { type: "end-group", group: "pointer" });
      const resized = history.present;

      expect(history.past).toHaveLength(before.past.length + 1);
      expect(resized.selectedLayer).toBe(layer.id);
      drawEmoji(ctx, resized.settings, 0);
      const resizedPixels = ctx.getImageData(0, 0, 128, 128).data;
      expect(resizedPixels).not.toEqual(beforePixels);
      history = editorHistoryReducer(history, { type: "undo" });
      expect(history.present).toEqual(before.present);
      drawEmoji(ctx, history.present.settings, 0);
      expect(ctx.getImageData(0, 0, 128, 128).data).toEqual(beforePixels);
      history = editorHistoryReducer(history, { type: "redo" });
      expect(history.present).toEqual(resized);
      if (type === "image")
        expect(history.present.settings.layers[0]).toMatchObject({
          source,
          rotation: 45,
          fit: "contain",
        });
      drawEmoji(ctx, history.present.settings, 0);
      expect(ctx.getImageData(0, 0, 128, 128).data).toEqual(resizedPixels);
    },
  );
  test("edits and deletes independent text layers with reversible selection [E5y]", () => {
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "add-text",
      layer: { ...initialTextLayer, id: "second", text: "두번째", font: "Jua", color: "#0000ff" },
    });
    expect(history.present.selectedLayer).toBe("second");
    history = editorHistoryReducer(history, {
      type: "change-text",
      id: "second",
      patch: { text: "수정", gradient: { end: "#ff0000", direction: "vertical" }, x: 90 },
    });
    expect(history.present.settings.layers[0]).toEqual(initialTextLayer);
    const edited = history.present;

    history = editorHistoryReducer(history, { type: "delete", id: "second" });
    expect(history.present.settings.layers).toEqual([initialTextLayer]);
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present).toEqual(edited);
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present.settings.layers[1]).toMatchObject({
      text: "두번째",
      font: "Jua",
      x: 64,
    });
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present).toEqual(initialEditorHistory.present);
    for (let index = 0; index < 3; index++)
      history = editorHistoryReducer(history, { type: "redo" });
    expect(history.present.settings.layers).toEqual([initialTextLayer]);
    expect(history.present.selectedLayer).toBeNull();
  });

  test("reorders mixed layers and restores their resources and rendered output [E5y]", () => {
    const source = createCanvas(128, 128);
    source.getContext("2d").fillStyle = "#ff0000";
    source.getContext("2d").fillRect(0, 0, 128, 128);
    const image: ImageLayer = {
      type: "image",
      id: "image",
      name: "image.png",
      source: source as unknown as HTMLCanvasElement,
      aspectRatio: 1,
      x: 64,
      y: 64,
      size: 128,
      rotation: 0,
      fit: "cover",
    };
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "change",
      patch: {
        motion: "none",
        layers: [
          initialTextLayer,
          image,
          { ...initialTextLayer, id: "front", text: "HH", color: "#0000ff" },
        ],
      },
    });
    history = editorHistoryReducer(history, { type: "select", id: "front" });
    const before = history.present;
    const ctx = createCanvas(128, 128).getContext("2d") as unknown as CanvasRenderingContext2D;
    drawEmoji(ctx, before.settings, 0);
    const expected = ctx.getImageData(0, 0, 128, 128).data;

    history = editorHistoryReducer(history, { type: "reorder", id: "front", direction: -1 });
    expect(history.present.settings.layers.map((layer) => layer.id)).toEqual([
      initialTextLayer.id,
      "front",
      "image",
    ]);
    drawEmoji(ctx, history.present.settings, 0);
    expect(ctx.getImageData(0, 0, 128, 128).data).not.toEqual(expected);
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present).toEqual(before);
    expect(
      history.present.settings.layers.filter((layer) => layer.type === "image")[0].source,
    ).toBe(source);
    drawEmoji(ctx, history.present.settings, 0);
    expect(ctx.getImageData(0, 0, 128, 128).data).toEqual(expected);
    history = editorHistoryReducer(history, { type: "redo" });
    expect(history.present.settings.layers.map((layer) => layer.id)).toEqual([
      initialTextLayer.id,
      "front",
      "image",
    ]);
    expect(editorHistoryReducer(history, { type: "reorder", id: "image", direction: 1 })).toBe(
      history,
    );
  });

  test("keeps blank texts selectable and ignores late edits to deleted layers [E5y]", () => {
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { text: "" },
    });
    history = editorHistoryReducer(history, { type: "select", id: initialTextLayer.id });
    expect(history.present.selectedLayer).toBe(initialTextLayer.id);
    history = editorHistoryReducer(history, { type: "delete", id: initialTextLayer.id });

    expect(
      editorHistoryReducer(history, {
        type: "change-text",
        id: initialTextLayer.id,
        patch: { font: "Jua" },
      }),
    ).toBe(history);
    expect(
      editorHistoryReducer(history, { type: "reorder", id: initialTextLayer.id, direction: -1 }),
    ).toBe(history);
  });

  test("restores deleted image resources, stacking and exact rendered pixels", () => {
    const source = createCanvas(16, 8);
    source.getContext("2d").fillStyle = "#f43060";
    source.getContext("2d").fillRect(0, 0, 16, 8);
    const image: ImageLayer = {
      type: "image",
      id: "front",
      name: "front.png",
      source: source as unknown as HTMLCanvasElement,
      aspectRatio: 2,
      x: 42,
      y: 77,
      size: 65,
      rotation: 27,
      fit: "contain",
    };
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "change",
      patch: { layers: [{ ...image, id: "back", x: 80 }, image] },
    });
    history = editorHistoryReducer(history, { type: "select", id: image.id });
    const before = history.present;
    const expected = createCanvas(128, 128).getContext("2d") as unknown as CanvasRenderingContext2D;
    drawEmoji(expected, before.settings, 0);

    history = editorHistoryReducer(history, { type: "delete", id: image.id });
    expect(history.present.settings.layers.map((layer) => layer.id)).toEqual(["back"]);
    history = editorHistoryReducer(history, { type: "undo" });
    const restored = createCanvas(128, 128).getContext("2d") as unknown as CanvasRenderingContext2D;
    drawEmoji(restored, history.present.settings, 0);

    expect(history.present).toEqual(before);
    expect(
      history.present.settings.layers.filter((layer) => layer.type === "image")[1].source,
    ).toBe(source);
    expect(restored.getImageData(0, 0, 128, 128).data).toEqual(
      expected.getImageData(0, 0, 128, 128).data,
    );
    history = editorHistoryReducer(history, { type: "redo" });
    expect(history.present.settings.layers.map((layer) => layer.id)).toEqual(["back"]);
  });

  test.each(["pointer", "keyboard"] as const)(
    "undoes one %s gesture at a time, including repeated movement",
    (group) => {
      let history = editorHistoryReducer(initialEditorHistory, {
        type: "select",
        id: initialTextLayer.id,
      });
      history = editorHistoryReducer(history, { type: "begin-group", group });
      for (const x of [65, 66, 69, 70]) {
        history = editorHistoryReducer(history, { type: "begin-group", group });
        history = editorHistoryReducer(history, {
          type: "move",
          id: initialTextLayer.id,
          x,
          y: 64,
        });
      }
      history = editorHistoryReducer(history, { type: "end-group", group });
      history = editorHistoryReducer(history, { type: "begin-group", group });
      history = editorHistoryReducer(history, {
        type: "move",
        id: initialTextLayer.id,
        x: 80,
        y: 64,
      });
      history = editorHistoryReducer(history, { type: "end-group", group });

      history = editorHistoryReducer(history, { type: "undo" });
      expect(history.present.settings.layers[0].x).toBe(70);
      history = editorHistoryReducer(history, { type: "undo" });
      expect(history.present.settings.layers[0]).toMatchObject({ x: 64, y: 64, scale: 1 });
      expect(history.present.selectedLayer).toBe(initialTextLayer.id);
      history = editorHistoryReducer(history, { type: "redo" });
      expect(history.present.settings.layers[0].x).toBe(70);
    },
  );

  test("groups a slider gesture without combining the next document action", () => {
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "begin-group",
      group: "pointer",
    });
    for (const delay of [100, 500, 800])
      history = editorHistoryReducer(history, { type: "change", patch: { delay } });
    history = editorHistoryReducer(history, { type: "end-group", group: "pointer" });
    history = editorHistoryReducer(history, { type: "change", patch: { motion: "roll" } });

    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present.settings).toMatchObject({ delay: 800, motion: initialSettings.motion });
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present.settings.delay).toBe(initialSettings.delay);
    history = editorHistoryReducer(history, { type: "redo" });
    expect(history.present.settings.delay).toBe(800);
  });

  test("keeps a text focus session together through unrelated pointer releases", () => {
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "begin-group",
      group: "input",
    });
    history = editorHistoryReducer(history, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { text: "A" },
    });
    history = editorHistoryReducer(history, { type: "end-group", group: "pointer" });
    history = editorHistoryReducer(history, { type: "end-group", group: "keyboard" });
    history = editorHistoryReducer(history, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { text: "AB" },
    });
    history = editorHistoryReducer(history, { type: "end-group", group: "input" });

    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present.settings.layers[0]).toMatchObject({ text: initialTextLayer.text });
    history = editorHistoryReducer(history, { type: "redo" });
    expect(history.present.settings.layers[0]).toMatchObject({ text: "AB" });
  });

  test.each(["text", "placement"])(
    "does not record a %s gesture that returns to its start",
    (field) => {
      let history = editorHistoryReducer(initialEditorHistory, {
        type: "begin-group",
        group: "pointer",
      });
      history = editorHistoryReducer(history, {
        type: "change-text",
        id: initialTextLayer.id,
        patch: field === "text" ? { text: "임시" } : { x: 70, y: 64, scale: 1 },
      });
      history = editorHistoryReducer(history, {
        type: "change-text",
        id: initialTextLayer.id,
        patch: field === "text" ? { text: initialTextLayer.text } : { x: 64, y: 64, scale: 1 },
      });
      history = editorHistoryReducer(history, { type: "end-group" });

      expect(editorHistoryReducer(history, { type: "undo" })).toBe(history);
      expect(history.past).toHaveLength(0);
    },
  );

  test("ignores no-op edits and UI selection without losing redo", () => {
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { gradient: { end: "#123456", direction: "horizontal" }, characterColors: undefined },
    });
    history = editorHistoryReducer(history, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { color: "#112233" },
    });
    history = editorHistoryReducer(history, { type: "undo" });
    history = editorHistoryReducer(history, { type: "select", id: initialTextLayer.id });

    expect(
      editorHistoryReducer(history, {
        type: "change-text",
        id: initialTextLayer.id,
        patch: {
          gradient: { end: "#123456", direction: "horizontal" },
        },
      }),
    ).toBe(history);
    expect(editorHistoryReducer(history, { type: "delete", id: "missing" })).toBe(history);
    expect(editorHistoryReducer(history, { type: "move", id: "missing", x: 1, y: 1 })).toBe(
      history,
    );
    expect(
      editorHistoryReducer(history, { type: "redo" }).present.settings.layers[0],
    ).toMatchObject({ color: "#112233" });
  });

  test("clears redo only when a new document edit branches from restored settings", () => {
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { text: "이전" },
    });
    history = editorHistoryReducer(history, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { text: "이후" },
    });
    history = editorHistoryReducer(history, { type: "undo" });
    history = editorHistoryReducer(history, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { text: "새 편집" },
    });

    expect(editorHistoryReducer(history, { type: "redo" })).toBe(history);
    expect(
      editorHistoryReducer(history, { type: "undo" }).present.settings.layers[0],
    ).toMatchObject({ text: "이전" });
  });

  test("captures colors, motion and same-label font replacements as document edits", () => {
    const changes = [
      {
        type: "change-text",
        id: initialTextLayer.id,
        patch: { color: "#123456", characterColors: { 0: "#654321" } },
      },
      {
        type: "change-text",
        id: initialTextLayer.id,
        patch: { gradient: { end: "#aabbcc", direction: "vertical" }, characterColors: undefined },
      },
      { type: "change", patch: { transparent: false, background: "#ff3322" } },
      { type: "change", patch: { motion: "swing", speed: 2, delay: 700 } },
      {
        type: "change-text",
        id: initialTextLayer.id,
        patch: { font: "upload-first", fontLabel: "same.woff2 (업로드)" },
      },
      {
        type: "change-text",
        id: initialTextLayer.id,
        patch: { font: "upload-second", fontLabel: "same.woff2 (업로드)" },
      },
      {
        type: "change-text",
        id: initialTextLayer.id,
        patch: { font: "Jua", fontLabel: undefined },
      },
    ] as const;
    let history = initialEditorHistory;
    const documents = [history.present.settings];
    for (const action of changes) {
      history = editorHistoryReducer(history, action);
      documents.push(history.present.settings);
    }

    for (const settings of documents.slice(0, -1).toReversed()) {
      history = editorHistoryReducer(history, { type: "undo" });
      expect(history.present.settings).toEqual(settings);
    }
    for (const settings of documents.slice(1)) {
      history = editorHistoryReducer(history, { type: "redo" });
      expect(history.present.settings).toEqual(settings);
    }
  });

  test("walks each of the 100 retained actions in order and stops at both ends [E5ao]", () => {
    let history = initialEditorHistory;
    for (let index = 1; index <= 101; index++)
      history = editorHistoryReducer(history, {
        type: "change-text",
        id: initialTextLayer.id,
        patch: { text: String(index) },
      });

    for (let index = 0; index < 100; index++) {
      history = editorHistoryReducer(history, { type: "undo" });
      expect(history.present.settings.layers[0]).toMatchObject({ text: String(100 - index) });
    }
    expect(editorHistoryReducer(history, { type: "undo" })).toBe(history);
    for (let index = 0; index < 100; index++) {
      history = editorHistoryReducer(history, { type: "redo" });
      expect(history.present.settings.layers[0]).toMatchObject({ text: String(index + 2) });
    }
    expect(editorHistoryReducer(history, { type: "redo" })).toBe(history);
  });

  test.each(["return", "commit", "undo"] as const)(
    "preserves the history limit when a full-capacity gesture ends by %s",
    (ending) => {
      let history = initialEditorHistory;
      for (let index = 1; index <= 100; index++)
        history = editorHistoryReducer(history, {
          type: "change-text",
          id: initialTextLayer.id,
          patch: { text: String(index) },
        });
      history = editorHistoryReducer(history, { type: "begin-group", group: "input" });
      history = editorHistoryReducer(history, {
        type: "change-text",
        id: initialTextLayer.id,
        patch: { text: "진행 중" },
      });

      if (ending === "return")
        history = editorHistoryReducer(history, {
          type: "change-text",
          id: initialTextLayer.id,
          patch: { text: "100" },
        });
      history = editorHistoryReducer(history, { type: ending === "undo" ? "undo" : "end-group" });
      for (let index = 0; index < 100; index++)
        history = editorHistoryReducer(history, { type: "undo" });

      expect(history.present.settings.layers[0]).toMatchObject({
        text: ending === "return" ? initialTextLayer.text : "1",
      });
      expect(editorHistoryReducer(history, { type: "undo" })).toBe(history);
    },
  );

  test("adds asynchronously decoded images to the current document within the layer limit", () => {
    const source = createCanvas(1, 1) as unknown as HTMLCanvasElement;
    const images: ImageLayer[] = Array.from({ length: 12 }, (_, index) => ({
      type: "image",
      id: String(index),
      name: `${index}.png`,
      source,
      aspectRatio: 1,
      x: 64,
      y: 64,
      size: 40,
      rotation: 0,
      fit: "contain",
    }));
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "add-images",
      images: images.slice(0, 11),
    });
    history = editorHistoryReducer(history, {
      type: "change-text",
      id: initialTextLayer.id,
      patch: { text: "최근 입력" },
    });

    history = editorHistoryReducer(history, {
      type: "add-images",
      images: [images[11], { ...images[0], id: "excess" }],
    });

    expect(history.present.settings.layers[0]).toMatchObject({ text: "최근 입력" });
    expect(
      history.present.settings.layers
        .filter((layer) => layer.type === "image")
        .map((image) => image.id),
    ).toEqual(images.map((image) => image.id));
    history = editorHistoryReducer(history, { type: "undo" });
    expect(history.present.settings.layers.filter((layer) => layer.type === "image")).toHaveLength(
      11,
    );
    expect(history.present.settings.layers[0]).toMatchObject({ text: "최근 입력" });
  });

  test("does not let an old panel dismissal clear a newly selected layer", () => {
    const source = createCanvas(1, 1) as unknown as HTMLCanvasElement;
    let history = editorHistoryReducer(initialEditorHistory, {
      type: "add-images",
      images: [
        {
          type: "image",
          id: "image",
          name: "a.png",
          source,
          aspectRatio: 1,
          x: 64,
          y: 64,
          size: 40,
          rotation: 0,
          fit: "contain",
        },
      ],
    });
    history = editorHistoryReducer(history, { type: "select", id: initialTextLayer.id });
    history = editorHistoryReducer(history, { type: "select", id: "image" });

    history = editorHistoryReducer(history, { type: "deselect", id: initialTextLayer.id });
    expect(history.present.selectedLayer).toBe("image");
    history = editorHistoryReducer(history, { type: "deselect", id: "image" });
    expect(history.present.selectedLayer).toBeNull();
    history = editorHistoryReducer(history, { type: "select", id: "missing" });
    expect(history.present.selectedLayer).toBeNull();
  });
});
