import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  EditorAccordionItem,
  ColorPicker,
  SegmentedControl,
  Select,
  FormField,
  ContentTextArea,
  RangeField,
} from "~/components/design-system";
import { constrainText, maxTextCharacters, textCharacters, validateText } from "~/lib/emoji";
import type { TextLayer } from "~/lib/emoji";
import { FontPicker } from "./FontPicker";

export function TextLayerEditor({
  layer,
  uploadedFont,
  onUpload,
  onChange,
  onLoading,
  onComposingChange,
}: {
  layer: TextLayer;
  uploadedFont: { family: string; label: string } | null;
  onUpload: (font: { family: string; label: string; face: FontFace }) => void;
  onChange: (patch: Partial<Omit<TextLayer, "id" | "type">>) => void;
  onLoading: (loading: boolean) => void;
  onComposingChange: (composing: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const composing = useRef(false);
  const invalid = validateText(layer.text);
  const value = draft ?? layer.text;
  useEffect(() => () => onComposingChange(false), [onComposingChange]);
  return (
    <div>
      <Accordion type="multiple" defaultValue={["content"]}>
        <EditorAccordionItem
          id="layer-text-settings"
          value="content"
          title="텍스트"
          summary={layer.text || "비어 있음"}
        >
          <div className="overflow-hidden rounded-panel border border-stroke-neutral bg-bg-neutral-weak transition-colors duration-150 hover:not-focus-within:border-stroke-neutral-strong focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-stroke-brand has-aria-invalid:border-fg-critical has-aria-invalid:outline-fg-critical motion-reduce:transition-none">
            <ContentTextArea
              id="layer-text"
              name="emoji-text"
              aria-label="레이어 텍스트"
              aria-describedby={invalid ? "text-error text-count" : "text-count"}
              aria-invalid={!!invalid}
              autoComplete="off"
              spellCheck={false}
              style={{
                fontFamily: `"${layer.font}"`,
                fontWeight: layer.font === "Pretendard" ? 600 : undefined,
                lineHeight: layer.lineHeight / 100,
              }}
              value={value}
              rows={Math.max(1, value.split("\n").length)}
              wrap="off"
              onCompositionStart={() => {
                composing.current = true;
                onComposingChange(true);
                setDraft(layer.text);
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                onComposingChange(false);
                const text = constrainText(event.currentTarget.value);
                setDraft(null);
                onChange({ text, characterColors: undefined });
                setNotice(
                  text !== event.currentTarget.value
                    ? `최대 ${maxTextCharacters}자, 3줄까지 입력할 수 있어요.`
                    : "",
                );
              }}
              onChange={(event) => {
                if (composing.current) {
                  setDraft(event.target.value);
                  return;
                }
                const text = constrainText(event.target.value);
                setDraft(null);
                onChange({ text, characterColors: undefined });
                setNotice(
                  text !== event.target.value
                    ? `최대 ${maxTextCharacters}자, 3줄까지 입력할 수 있어요.`
                    : "",
                );
              }}
            />
          </div>
          <div
            id="text-count"
            className="mt-control flex justify-between gap-control text-caption text-fg-neutral-muted tabular-nums"
          >
            <span className="min-w-0 truncate">{layer.fontLabel ?? layer.font}</span>
            <span className="shrink-0">
              {textCharacters(layer.text).length}/{maxTextCharacters} ·{" "}
              {layer.text.split("\n").length}/3줄
            </span>
          </div>
          {invalid && (
            <p id="text-error" className="mt-control text-caption text-fg-critical">
              {invalid}
            </p>
          )}
          <p role="status" className="mt-control text-caption text-fg-neutral-muted empty:hidden">
            {notice}
          </p>
          <div className="mt-group">
            <RangeField
              label="줄간격"
              value={layer.lineHeight}
              min={50}
              max={200}
              suffix="%"
              onChange={(lineHeight) => onChange({ lineHeight })}
            />
          </div>
        </EditorAccordionItem>
        <EditorAccordionItem
          id="layer-font-settings"
          value="font"
          title="글꼴"
          summary={layer.fontLabel ?? layer.font}
        >
          <FontPicker
            font={layer.font}
            fontLabel={layer.fontLabel}
            uploadedFont={uploadedFont}
            onUpload={onUpload}
            onChange={(font, fontLabel) => onChange({ font, fontLabel })}
            onLoading={onLoading}
          />
        </EditorAccordionItem>
        <EditorAccordionItem
          value="color"
          title="색상 옵션"
          summary={layer.gradient ? "그라데이션" : layer.characterColors ? "글자별" : "단색"}
        >
          <div className="mb-group">
            <SegmentedControl
              label="색상 방식"
              value={layer.gradient ? "gradient" : "solid"}
              options={[
                { value: "solid", label: "단색 · 글자별" },
                { value: "gradient", label: "그라데이션" },
              ]}
              onChange={(mode) =>
                onChange(
                  mode === "gradient"
                    ? {
                        gradient: { end: "#fc6a66", direction: "horizontal" },
                        characterColors: undefined,
                      }
                    : { gradient: undefined },
                )
              }
            />
          </div>
          <div className="mb-group">
            <ColorPicker
              label={layer.gradient ? "시작색" : "글자색"}
              value={layer.color}
              onChange={(color) => onChange({ color, characterColors: undefined })}
            />
          </div>
          <div className="grid grid-cols-2 gap-control">
            {layer.gradient && (
              <ColorPicker
                label="끝색"
                value={layer.gradient.end}
                onChange={(end) => onChange({ gradient: { ...layer.gradient!, end } })}
              />
            )}
          </div>
          {layer.gradient && (
            <FormField.Label className="mt-group flex items-center gap-inset text-label text-fg-neutral-secondary">
              방향
              <Select
                value={layer.gradient.direction}
                onValueChange={(direction) =>
                  onChange({
                    gradient: {
                      ...layer.gradient!,
                      direction: direction as "horizontal" | "vertical",
                    },
                  })
                }
              >
                <Select.Trigger aria-label="그라데이션 방향" className="flex-1">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="horizontal">가로 →</Select.Item>
                  <Select.Item value="vertical">세로 ↓</Select.Item>
                </Select.Content>
              </Select>
            </FormField.Label>
          )}
          {!layer.gradient && (
            <div className="mt-group flex flex-wrap gap-control" aria-label="글자별 색상">
              {textCharacters(layer.text).map(
                (character, index) =>
                  character.trim() && (
                    <ColorPicker
                      key={index}
                      label={`${index + 1}번째 글자 ${character} 색상`}
                      displayLabel={character}
                      value={layer.characterColors?.[index] ?? layer.color}
                      onChange={(color) =>
                        onChange({ characterColors: { ...layer.characterColors, [index]: color } })
                      }
                    />
                  ),
              )}
            </div>
          )}
        </EditorAccordionItem>
      </Accordion>
    </div>
  );
}
