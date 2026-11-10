import { EditorOnboarding } from "~/components/EditorOnboarding";
import { initialTextColor } from "~/lib/initial-text-color";
import { previewUser } from "~/lib/preview-user";
import { MochiGallery } from "~/components/MochiGallery";
import { createRecipe } from "~/lib/mochi-recipe";
import {
  Accordion,
  EditorAccordionItem,
  Button,
  Checkbox,
  ChoiceButton,
  ColorPicker,
  HelpBubble,
  HistoryButton,
  MotionIcon,
  Select,
  SegmentedControl,
  RangeField,
  FormField,
  Link,
  ReactionButton,
  Spinner,
  toast,
} from "~/components/design-system";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  drawEmoji,
  exportGif,
  downloadFilename,
  exportEmoji,
  motions,
  motionFrameDelays,
  initialTextLayer,
  validateSettings,
} from "../lib/emoji";
import type { Settings } from "../lib/emoji";
import { CanvasEditor } from "~/components/editor/CanvasEditor";
import { LayerEditor } from "~/components/editor/LayerEditor";
import { LayerControls } from "~/components/editor/LayerControls";
import { loadLayerFonts } from "~/lib/font-loading";
import { editorHistoryReducer, initialEditorHistory } from "~/lib/editor-history";

export function EditorPage() {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [history, dispatch] = useReducer(editorHistoryReducer, initialEditorHistory, (history) => ({
    ...history,
    present: {
      ...history.present,
      settings: {
        ...history.present.settings,
        layers: [{ ...initialTextLayer, color: initialTextColor }],
      },
    },
  }));
  const { settings, selectedLayer } = history.present;
  const recipe = useMemo(
    () => (import.meta.env.VITE_ENABLE_MOCHI_RECIPES === "true" ? createRecipe(settings) : null),
    [settings],
  );
  const [fontLoading, setFontLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [uploadedFont, setUploadedFont] = useState<{ family: string; label: string } | null>(null);
  const uploadedFaces = useRef(new Map<string, FontFace>());
  const [reacted, setReacted] = useState(false);
  const [openPanels, setOpenPanels] = useState<string[]>(["motion"]);
  const selectedAnchor = useRef<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState(true);
  const [galleryRevision, setGalleryRevision] = useState(0);
  const [status, setStatus] = useState("");
  const [renderAttempt, setRenderAttempt] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const smallCanvas = useRef<HTMLCanvasElement>(null);
  const retainedFonts = useMemo(
    () =>
      new Set(
        [...history.past, history.present, ...history.future].flatMap((snapshot) =>
          snapshot.settings.layers.flatMap((layer) => (layer.type === "text" ? [layer.font] : [])),
        ),
      ),
    [history.past, history.present, history.future],
  );
  const selected = settings.layers.find((layer) => layer.id === selectedLayer);
  const invalid = validateSettings(settings);
  useEffect(() => {
    const faces = uploadedFaces.current;
    return () => {
      for (const face of faces.values()) document.fonts.delete(face);
      faces.clear();
    };
  }, []);
  useEffect(() => {
    for (const [family, face] of uploadedFaces.current) {
      if (family !== uploadedFont?.family && !retainedFonts.has(family)) {
        document.fonts.delete(face);
        uploadedFaces.current.delete(family);
      }
    }
  }, [retainedFonts, uploadedFont]);
  function update(patch: Partial<Settings>) {
    dispatch({ type: "change", patch });
    setStatus("");
  }

  function selectLayer(id: string | null) {
    dispatch({ type: "select", id });
  }

  function deleteLayer(id: string) {
    dispatch({ type: "delete", id });
    setStatus("");
    toast(
      settings.layers.find((layer) => layer.id === id)?.type === "text"
        ? "텍스트를 삭제했어요. 실행 취소로 복구할 수 있어요."
        : "이미지를 삭제했어요. 실행 취소로 복구할 수 있어요.",
      { id: "editor-layer-delete" },
    );
    requestAnimationFrame(() => document.getElementById("work-canvas")?.focus());
  }

  function restore(type: "undo" | "redo", focusCanvas = true) {
    if (fontLoading || composing || !(type === "undo" ? history.past : history.future).length)
      return;
    dispatch({ type });
    setStatus("");
    if (focusCanvas)
      requestAnimationFrame(() => {
        const surface = document.getElementById("work-canvas");
        (
          surface?.querySelector<HTMLElement>('[data-layer][aria-pressed="true"]') ?? surface
        )?.focus();
      });
  }

  useEffect(() => {
    const endPointer = () => dispatch({ type: "end-group", group: "pointer" });
    const endKeyboard = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) dispatch({ type: "end-group", group: "keyboard" });
    };
    const endAll = () => dispatch({ type: "end-group" });
    window.addEventListener("pointerup", endPointer);
    window.addEventListener("pointercancel", endPointer);
    window.addEventListener("lostpointercapture", endPointer);
    window.addEventListener("keyup", endKeyboard);
    window.addEventListener("blur", endAll);
    return () => {
      window.removeEventListener("pointerup", endPointer);
      window.removeEventListener("pointercancel", endPointer);
      window.removeEventListener("lostpointercapture", endPointer);
      window.removeEventListener("keyup", endKeyboard);
      window.removeEventListener("blur", endAll);
    };
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", onChange);
    onChange();
    return () => preference.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let active = true;
    let frame = 0;
    async function start() {
      await loadLayerFonts(settings.layers);
      if (!active) return;
      const startedAt = performance.now();
      const duration = motionFrameDelays[settings.speed] * 20;
      function render(time: number) {
        try {
          const ctx = canvas.current?.getContext("2d");
          const small = smallCanvas.current?.getContext("2d");
          if (!ctx || !small) throw new Error("Canvas context unavailable");
          drawEmoji(
            ctx,
            settings,
            reducedMotion
              ? 0
              : Math.max(0, ((time - startedAt) % (duration + settings.delay)) - settings.delay) /
                  duration,
          );
          small.clearRect(0, 0, 128, 128);
          small.drawImage(ctx.canvas, 0, 0);
        } catch {
          if (active)
            setStatus("미리보기를 그리지 못했어요. 설정을 바꾸거나 페이지를 다시 열어 주세요.");
          return;
        }
        if (!reducedMotion && settings.motion !== "none") frame = requestAnimationFrame(render);
      }
      frame = requestAnimationFrame(render);
    }
    void start().catch((cause) => {
      if (active)
        setStatus(
          cause instanceof Error
            ? cause.message
            : "미리보기를 불러오지 못했어요. 다시 시도해 주세요.",
        );
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [settings, reducedMotion, renderAttempt]);

  async function download() {
    setBusy(true);
    setStatus("이미지를 만들고 있어요…");
    try {
      await loadLayerFonts(settings.layers);
      const output = document.createElement("canvas");
      output.width = 128;
      output.height = 128;
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("이 브라우저에서는 이미지를 만들 수 없어요.");
      const blob = await exportEmoji(ctx, settings);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename(settings.layers, settings.motion === "none" ? "png" : "gif");
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast(`다운로드 완료 · ${(blob.size / 1024).toFixed(1)} KB`, { id: "editor-download" });
      setStatus(publish ? "모두의 모찌에 공개하고 있어요…" : "");
      if (publish) {
        try {
          const response = await fetch("/api/mochi", {
            method: "POST",
            headers: {
              "Content-Type": recipe ? "application/json" : "image/gif",
              "X-Mochi-Filename": encodeURIComponent(downloadFilename(settings.layers, "gif")),
            },
            body: recipe
              ? JSON.stringify(recipe)
              : settings.motion === "none"
                ? await exportGif(ctx, settings)
                : blob,
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw new Error("publish");
          const { id } = (await response.json()) as { id: string };
          setGalleryRevision((value) => value + 1);
          setStatus("");
          toast("다운로드 완료 · 모두의 모찌에 공개했어요.", { id: "editor-download" });
          try {
            const counted = await fetch(`/api/mochi/${id}/${recipe ? "count" : "download"}`, {
              method: "POST",
              signal: AbortSignal.timeout(15000),
            });
            await counted.body?.cancel();
            if (!counted.ok) throw new Error("count");
            setGalleryRevision((value) => value + 1);
          } catch {
            setStatus("다운로드·공개 완료 · 다운로드 횟수는 반영하지 못했어요.");
          }
        } catch {
          setStatus(
            "다운로드는 완료했지만 공개하지 못했어요. 다시 다운로드하면 공개를 재시도해요.",
          );
        }
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "이미지 생성에 실패했어요. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-page py-section max-[760px]:px-group max-[760px]:py-group">
      <Link
        className="focus-visible:outline-2 focus-visible:outline-stroke-focus focus-visible:outline-offset-2 [-webkit-tap-highlight-color:transparent] touch-manipulation fixed top-2 left-2 z-10 -translate-y-[200%] rounded-control bg-bg-layer-default p-3 text-fg-brand focus:translate-y-0"
        href="#editor-main"
      >
        편집기로 건너뛰기
      </Link>
      <main
        id="editor-main"
        tabIndex={-1}
        className="rounded-workspace border border-stroke-neutral bg-bg-layer-default shadow-control"
        onPointerDownCapture={(event) => {
          if (
            event.button === 0 &&
            (event.target as HTMLElement).closest("#work-canvas [data-layer], [data-slider-root]")
          )
            dispatch({ type: "begin-group", group: "pointer" });
        }}
        onKeyDownCapture={(event) => {
          if (
            !event.metaKey &&
            !event.ctrlKey &&
            event.key.startsWith("Arrow") &&
            (event.target as HTMLElement).closest(
              '#work-canvas [data-layer], [role="slider"], input[type="radio"]',
            )
          )
            dispatch({ type: "begin-group", group: "keyboard" });
        }}
        onFocusCapture={(event) => {
          if (
            event.target.matches(
              'textarea, input:not([type="range"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])',
            )
          )
            dispatch({ type: "begin-group", group: "input" });
        }}
        onBlurCapture={() => {
          dispatch({ type: "end-group", group: "input" });
          dispatch({ type: "end-group", group: "keyboard" });
        }}
        onKeyDown={(event) => {
          const target = event.target as HTMLElement;
          if (
            event.defaultPrevented ||
            event.nativeEvent.isComposing ||
            composing ||
            fontLoading ||
            target.closest(
              'textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], input:not([type="range"]):not([type="color"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"])',
            )
          )
            return;
          const key = event.key.toLowerCase();
          if (
            !event.altKey &&
            (event.metaKey || event.ctrlKey) &&
            (key === "z" || (event.ctrlKey && key === "y"))
          ) {
            event.preventDefault();
            if (!document.querySelector('[aria-modal="true"]'))
              restore(key === "y" || event.shiftKey ? "redo" : "undo");
          } else if (
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            selectedLayer &&
            (event.key === "Backspace" || event.key === "Delete") &&
            !target.closest("input, select") &&
            target.closest('#work-canvas, [aria-label="레이어 선택"], #layer-controls')
          ) {
            event.preventDefault();
            deleteLayer(selectedLayer);
          }
        }}
      >
        <header className="flex items-center gap-control border-b border-stroke-neutral p-panel max-[760px]:p-group">
          <Link
            className="inline-flex shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
            href="/"
            aria-label="슬랙모찌 홈"
          >
            <img src="/logo.svg" width="32" height="28" alt="" />
          </Link>
          <h1 className="text-base font-semibold">슬랙모찌</h1>
          <div className="ml-auto">
            <EditorOnboarding />
          </div>
          <div id="editor-history" className="flex gap-control" role="group" aria-label="편집 기록">
            <HistoryButton
              direction="undo"
              disabled={!history.past.length || fontLoading || composing}
              onRestore={() => restore("undo", false)}
            />
            <HistoryButton
              direction="redo"
              disabled={!history.future.length || fontLoading || composing}
              onRestore={() => restore("redo", false)}
            />
          </div>
        </header>
        <div className="grid grid-cols-3 items-start gap-section p-panel max-[760px]:p-group max-[1000px]:grid-cols-1">
          <section className="min-w-0" aria-label="이모지 편집">
            <div className="flex min-h-heading-slot items-center gap-1">
              <h2 className="text-body font-semibold">캔버스</h2>
              <HelpBubble label="캔버스 조작">
                <ul className="list-disc space-y-1 pl-4">
                  <li>모바일: 탭으로 선택한 뒤 드래그해 이동해요.</li>
                  <li>모서리를 드래그해 크기를 조절해요.</li>
                  <li>Alt를 누르는 동안 자석 정렬이 꺼져요.</li>
                </ul>
              </HelpBubble>
            </div>
            <CanvasEditor
              settings={settings}
              selectedId={selectedLayer}
              selectedAnchor={selectedAnchor}
              renderAttempt={renderAttempt}
              onRetry={() => {
                setStatus("");
                setRenderAttempt((attempt) => attempt + 1);
              }}
              onChooseFont={(id) => {
                selectLayer(id);
                requestAnimationFrame(() => {
                  const button = document
                    .getElementById("layer-font-settings")
                    ?.querySelector("button");
                  if (button?.getAttribute("aria-expanded") === "false") button.click();
                  button?.focus();
                });
              }}
              onSelect={selectLayer}
              onMove={(id, x, y) => {
                dispatch({ type: "move", id, x, y });
                setStatus("");
              }}
              onRotate={(id, rotation) => {
                const layer = settings.layers.find((item) => item.id === id);
                if (!layer) return;
                dispatch({
                  type: layer.type === "text" ? "change-text" : "change-image",
                  id,
                  patch: { rotation },
                });
                setStatus("");
              }}
              onResize={(id, patch) => {
                dispatch(
                  "scale" in patch
                    ? { type: "change-text", id, patch }
                    : { type: "change-image", id, patch },
                );
                setStatus("");
              }}
              onEditText={(id) => {
                selectLayer(id);
                requestAnimationFrame(() => {
                  const button = document
                    .getElementById("layer-text-settings")
                    ?.querySelector("button");
                  if (button?.getAttribute("aria-expanded") === "false") button.click();
                  requestAnimationFrame(() => document.getElementById("layer-text")?.focus());
                });
              }}
            />
            <LayerEditor
              layers={settings.layers}
              selectedId={selectedLayer}
              onSelect={selectLayer}
              onColorChange={(id, color) => {
                dispatch({ type: "change-text", id, patch: { color, characterColors: undefined } });
                setStatus("");
              }}
              onAddText={(preset) => {
                dispatch({
                  type: "add-text",
                  layer: {
                    ...initialTextLayer,
                    color: initialTextColor,
                    id: crypto.randomUUID(),
                    text: "텍스트",
                    scale: 0.6,
                    ...preset,
                  },
                });
                setStatus("");
                if (!preset)
                  requestAnimationFrame(() => document.getElementById("layer-text")?.focus());
              }}
              onAdd={(images) => {
                dispatch({ type: "add-images", images });
                setStatus("");
              }}
            />
            {selected && (
              <LayerControls
                key={selected.id}
                layer={selected}
                layers={settings.layers}
                anchor={selectedAnchor}
                uploadedFont={uploadedFont}
                onUpload={({ family, label, face }) => {
                  document.fonts.add(face);
                  uploadedFaces.current.set(family, face);
                  setUploadedFont({ family, label });
                }}
                onLoading={setFontLoading}
                onComposingChange={setComposing}
                onClose={() => dispatch({ type: "deselect", id: selected.id })}
                onDelete={() => deleteLayer(selected.id)}
                onTextChange={(patch) => {
                  dispatch({ type: "change-text", id: selected.id, patch });
                  setStatus("");
                }}
                onImageChange={(patch) => {
                  dispatch({ type: "change-image", id: selected.id, patch });
                  setStatus("");
                }}
                onReorder={(direction) => {
                  dispatch({ type: "reorder", id: selected.id, direction });
                  setStatus("");
                }}
              />
            )}
          </section>
          <section aria-label="이모지 설정" className="min-w-0 pt-heading-slot max-[1000px]:pt-0">
            <Accordion
              className="space-y-control"
              type="multiple"
              value={openPanels}
              onValueChange={(values) => {
                setOpenPanels(values);
              }}
            >
              <EditorAccordionItem
                value="background"
                title="배경"
                summary={
                  settings.transparent
                    ? "투명"
                    : settings.backgroundGradient
                      ? "그라데이션"
                      : settings.background
                }
              >
                <div className="mb-group">
                  <SegmentedControl
                    label="배경 색상 방식"
                    value={settings.backgroundGradient ? "gradient" : "solid"}
                    options={[
                      { value: "solid", label: "단색" },
                      { value: "gradient", label: "그라데이션" },
                    ]}
                    onChange={(mode) =>
                      update({
                        backgroundGradient:
                          mode === "gradient"
                            ? { end: "#7555e8", direction: "horizontal" }
                            : undefined,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-control">
                  <ColorPicker
                    label={settings.backgroundGradient ? "배경 시작색" : "배경색"}
                    displayLabel={settings.backgroundGradient ? "시작색" : "배경색"}
                    value={settings.background}
                    disabled={settings.transparent}
                    onChange={(background) => update({ background })}
                  />
                  {settings.backgroundGradient && (
                    <ColorPicker
                      label="배경 끝색"
                      displayLabel="끝색"
                      value={settings.backgroundGradient.end}
                      disabled={settings.transparent}
                      onChange={(end) =>
                        update({ backgroundGradient: { ...settings.backgroundGradient!, end } })
                      }
                    />
                  )}
                </div>
                {settings.backgroundGradient && (
                  <FormField.Label className="mt-group flex items-center gap-inset text-label text-fg-neutral-secondary">
                    모양
                    <Select
                      value={settings.backgroundGradient.direction}
                      disabled={settings.transparent}
                      onValueChange={(direction) =>
                        update({
                          backgroundGradient: {
                            ...settings.backgroundGradient!,
                            direction: direction as NonNullable<
                              Settings["backgroundGradient"]
                            >["direction"],
                          },
                        })
                      }
                    >
                      <Select.Trigger aria-label="배경 그라데이션 모양" className="flex-1">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="horizontal">가로 →</Select.Item>
                        <Select.Item value="vertical">세로 ↓</Select.Item>
                        <Select.Item value="radial">원형</Select.Item>
                        <Select.Item value="diamond">마름모</Select.Item>
                      </Select.Content>
                    </Select>
                  </FormField.Label>
                )}
                <div className="mt-group rounded-control bg-bg-neutral-weak">
                  <Checkbox
                    label="투명 배경으로 만들기"
                    checked={settings.transparent}
                    onCheckedChange={(transparent) => update({ transparent })}
                  />
                </div>
              </EditorAccordionItem>
              <EditorAccordionItem
                id="onboarding-effects"
                value="motion"
                title="효과"
                summary={motions[settings.motion]}
              >
                <div className="grid grid-cols-4 gap-control">
                  {Object.entries(motions).map(([motion, label]) => (
                    <ChoiceButton
                      className="flex flex-col items-center gap-control max-[480px]:px-control"
                      key={motion}
                      selected={settings.motion === motion}
                      onClick={() => update({ motion: motion as Settings["motion"] })}
                    >
                      <MotionIcon motion={motion as Settings["motion"]} />
                      <span className="text-caption">{label}</span>
                    </ChoiceButton>
                  ))}
                </div>
                <fieldset
                  disabled={settings.motion === "none"}
                  className="mt-group space-y-group border-0 p-0 disabled:text-fg-disabled"
                >
                  <legend className="sr-only">모션 타이밍</legend>
                  <div className="space-y-control">
                    <div className="text-label text-fg-neutral-secondary">속도</div>
                    <SegmentedControl
                      label="속도"
                      value={String(settings.speed)}
                      options={Object.keys(motionFrameDelays)
                        .sort((a, b) => Number(a) - Number(b))
                        .map((speed) => ({ value: speed, label: `${speed}×` }))}
                      onChange={(speed) => update({ speed: Number(speed) as Settings["speed"] })}
                    />
                  </div>
                  <RangeField
                    id="motion-delay"
                    label="반복 딜레이"
                    min={0}
                    max={2000}
                    step={100}
                    value={settings.delay}
                    valueLabel={`${(settings.delay / 1000).toFixed(1)}초`}
                    disabled={settings.motion === "none"}
                    onChange={(delay) => update({ delay })}
                  />
                </fieldset>
              </EditorAccordionItem>
            </Accordion>
          </section>
          <section
            className="flex min-w-0 flex-col min-[1001px]:sticky min-[1001px]:top-section"
            id="onboarding-preview"
            aria-label="미리보기"
          >
            <h2 className="min-h-heading-slot text-body font-semibold">미리보기</h2>
            <div className="grid flex-1 grid-rows-2">
              <section
                aria-label="슬랙 메시지 미리보기"
                className="flex min-h-48 items-center justify-center py-page"
              >
                <div className="flex items-start gap-2 text-[15px]">
                  <img
                    src={previewUser.avatar}
                    alt=""
                    width="36"
                    height="36"
                    className="size-9 shrink-0 rounded-lg bg-bg-neutral-weak"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 leading-5">
                      <strong className="font-semibold">{previewUser.name}</strong>
                      <time className="text-caption text-fg-neutral-muted" dateTime="00:54">
                        오전 12:54
                      </time>
                    </div>
                    <p className="mb-px text-base leading-[22px] wrap-anywhere">안녕하세요.</p>
                    <div className="flex flex-wrap items-center gap-0.5">
                      <span
                        className="inline-flex h-[26px] items-center justify-center gap-1 rounded-full border border-transparent bg-bg-layer-basement px-2 py-0.5 text-caption font-semibold leading-none text-fg-neutral tabular-nums"
                        aria-label="엄지 반응"
                      >
                        <span className="inline-flex size-4 items-center justify-center text-base">
                          👍🏻
                        </span>{" "}
                        <span>1</span>
                      </span>
                      <ReactionButton
                        type="button"
                        aria-label={`내 이모지 반응 ${reacted ? 2 : 1}개`}
                        aria-pressed={reacted}
                        onClick={() => setReacted((value) => !value)}
                      >
                        <canvas
                          ref={smallCanvas}
                          width={128}
                          height={128}
                          aria-label="슬랙 반응 크기 미리보기"
                        />
                        <span>{reacted ? 2 : 1}</span>
                      </ReactionButton>
                      <span
                        className="inline-flex h-6 items-center justify-center rounded-full bg-bg-layer-basement px-2 text-fg-neutral"
                        aria-hidden="true"
                      >
                        <svg
                          className="size-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 12a8 8 0 1 1-8-8h1M19 2v6m-3-3h6" />
                          <path d="M8.5 14a3.8 3.8 0 0 0 7 0" />
                          <circle cx="9" cy="10" r=".7" fill="currentColor" stroke="none" />
                          <circle cx="15" cy="10" r=".7" fill="currentColor" stroke="none" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </section>
              <section
                aria-label="확대 미리보기"
                className="flex min-h-48 items-center justify-center py-page"
              >
                <div className="aspect-square w-32 rounded-control bg-bg-checker-base bg-[conic-gradient(var(--color-bg-checker-tile)_25%,transparent_0_50%,var(--color-bg-checker-tile)_0_75%,transparent_0)] bg-size-[16px_16px] [&>canvas]:h-auto [&>canvas]:w-full">
                  <canvas ref={canvas} width={128} height={128} aria-label="이모지 확대 미리보기" />
                </div>
              </section>
            </div>
            <footer className="flex flex-col items-center gap-inset pt-group">
              <Checkbox
                label={recipe ? "모두의 모찌에 공개 (텍스트·설정 포함)" : "모두의 모찌에 공개"}
                checked={publish}
                onCheckedChange={setPublish}
                disabled={busy}
              />
              <p role="status" className="text-caption text-fg-neutral-muted empty:hidden">
                {status || invalid}
              </p>
              <Button
                variant="black"
                className="w-full"
                aria-busy={busy}
                disabled={!!invalid || busy || fontLoading || composing}
                onClick={() => void download()}
              >
                {busy && <Spinner />}
                {busy ? "만드는 중…" : "다운로드"}
              </Button>
            </footer>
          </section>
        </div>
      </main>
      <MochiGallery key={galleryRevision} />
    </div>
  );
}
