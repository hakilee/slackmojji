import { useEffect, useRef, useState } from "react";
import {
  Button,
  ColorPicker,
  ChoiceButton,
  HelpBubble,
  Input,
  Spinner,
} from "~/components/design-system";
import type { ImageLayer, Layer, TextLayer } from "~/lib/emoji";
import { loadImage } from "~/lib/image-upload";
import { EmojiPicker } from "./EmojiPicker";

export function LayerEditor({
  layers,
  onAddText,
  selectedId,
  onSelect,
  onAdd,
  onColorChange,
}: {
  layers: Layer[];
  onAddText: (preset?: Pick<TextLayer, "text" | "font">) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (images: ImageLayer[]) => void;
  onColorChange: (id: string, color: string) => void;
}) {
  const images = layers.filter((layer) => layer.type === "image");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <div id="layer-stack" className="mt-group space-y-inset">
      <div className="grid grid-cols-3 gap-control">
        <Button variant="white" size="small" className="px-2" onClick={() => onAddText()}>
          텍스트 추가
        </Button>
        <Button
          variant="white"
          size="small"
          className="px-2"
          disabled={loading || images.length >= 12}
          onClick={() => document.getElementById("image-upload")?.click()}
        >
          이미지 추가
        </Button>
        <EmojiPicker onAdd={(text) => onAddText({ text, font: "Pretendard" })} />
      </div>
      <div className="space-y-control">
        <div className="flex items-center gap-1">
          <h3 className="text-label font-semibold">레이어</h3>
          <HelpBubble label="레이어">
            위쪽 레이어가 앞에 보여요. 이미지는 최대 12개·파일당 5MB이며, GIF는 첫 프레임만
            사용해요.
          </HelpBubble>
        </div>
        <Input
          id="image-upload"
          type="file"
          className="hidden"
          aria-label="이미지 업로드"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          disabled={loading || images.length >= 12}
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (!files.length) return;
            setLoading(true);
            setErrors([]);
            const added: ImageLayer[] = [];
            const errors: string[] = [];
            for (const [index, file] of files.entries()) {
              if (added.length >= 12 - images.length) {
                errors.push(
                  `${files.length - index}개 파일을 건너뛰었어요. 이미지는 최대 12개까지 추가할 수 있어요.`,
                );
                break;
              }
              try {
                added.push(await loadImage(file));
              } catch (error) {
                errors.push(
                  `${file.name}: ${error instanceof Error ? error.message : "이미지를 불러오지 못했어요."}`,
                );
              }
              if (!mounted.current) return;
            }
            if (added.length) onAdd(added);
            setErrors(errors);
            setLoading(false);
          }}
        />
        {loading && (
          <p role="status" className="flex items-center gap-control text-caption">
            <Spinner />
            이미지 불러오는 중…
          </p>
        )}
        {errors.length > 0 && (
          <div role="alert" className="space-y-control text-caption text-fg-critical wrap-anywhere">
            <p>추가하지 못한 이미지가 있어요.</p>
            <ul className="list-disc space-y-control pl-4">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="space-y-control" role="group" aria-label="레이어 선택">
        {layers.toReversed().map((layer) => (
          <div key={layer.id} className="relative">
            <ChoiceButton
              aria-label={`${layer.type === "text" ? "텍스트" : "이미지"} 레이어 선택: ${layer.type === "text" ? layer.text.trim() || "빈 텍스트" : layer.name}`}
              className={`flex w-full items-center gap-inset text-left ${layer.type === "text" ? "pr-16" : ""}`}
              selected={selectedId === layer.id}
              onClick={(event) => {
                onSelect(layer.id);
                if (event.detail === 0)
                  requestAnimationFrame(() => {
                    document
                      .querySelector('#work-canvas [data-layer][aria-pressed="true"]')
                      ?.scrollIntoView({ block: "nearest" });
                    document.getElementById("layer-controls")?.focus({ preventScroll: true });
                  });
              }}
            >
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-control-inset bg-bg-neutral-weak text-label font-semibold"
              >
                {layer.type === "text" ? "T" : "▧"}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-label"
                  style={layer.type === "text" ? { fontFamily: `"${layer.font}"` } : undefined}
                >
                  {layer.type === "text" ? layer.text.trim() || "빈 텍스트" : layer.name}
                </span>
                <span className="block truncate text-caption text-fg-neutral-muted">
                  {layer.type === "text" ? (layer.fontLabel ?? layer.font) : "이미지"}
                </span>
              </span>
            </ChoiceButton>
            {layer.type === "text" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <ColorPicker
                  swatch
                  label={`${layer.text.trim() || "빈 텍스트"} 글자색`}
                  value={layer.color}
                  onChange={(color) => onColorChange(layer.id, color)}
                />
              </div>
            )}
          </div>
        ))}
        {!layers.length && (
          <p className="px-inset py-group text-caption text-fg-neutral-muted">
            텍스트나 이미지를 추가해 주세요.
          </p>
        )}
      </div>
    </div>
  );
}
