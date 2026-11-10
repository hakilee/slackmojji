import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  FormField,
  Input,
  Modal,
  SegmentedControl,
  Select,
  Spinner,
} from "~/components/design-system";
import { kaomojiCategories, kaomojiOptions } from "~/lib/kaomoji";
import { emojiCategories, loadEmojiCatalog, type EmojiOption } from "~/lib/emoji-catalog";

export function EmojiPicker({ onAdd }: { onAdd: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"emoji" | "kaomoji">("emoji");
  const [filters, setFilters] = useState({
    emoji: { query: "", category: "all" },
    kaomoji: { query: "", category: "all" },
  });
  const [catalog, setCatalog] = useState<EmojiOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(120);
  const searchInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const { query, category } = filters[mode];
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => {
    const terms = deferredQuery
      .normalize("NFKC")
      .toLowerCase()
      .split(/[_:\s]+/u)
      .filter(Boolean);
    return (mode === "emoji" ? (catalog ?? []) : kaomojiOptions).filter(
      (option) =>
        (category === "all" || option.category === category) &&
        terms.every((term) => option.search.includes(term)),
    );
  }, [mode, catalog, category, deferredQuery]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function loadCatalog() {
    if (catalog || loading) return;
    setLoading(true);
    setError("");
    try {
      const loaded = await loadEmojiCatalog();
      if (mounted.current) setCatalog(loaded);
    } catch {
      if (mounted.current)
        setError("이모지 목록을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) void loadCatalog();
      }}
    >
      <Modal.Trigger asChild>
        <Button variant="white" size="small" className="px-2">
          이모지 추가
        </Button>
      </Modal.Trigger>
      <Modal.Content
        aria-modal="true"
        onOpenAutoFocus={(event) => {
          if (!window.matchMedia("(pointer: coarse)").matches) {
            event.preventDefault();
            searchInput.current?.focus();
          }
        }}
        className="flex h-160 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-xl min-w-0 flex-col gap-inset overflow-y-auto overscroll-contain rounded-workspace border border-stroke-neutral bg-bg-layer-default p-panel text-fg-neutral shadow-floating outline-none max-[480px]:p-group"
      >
        <div className="flex shrink-0 items-center justify-between gap-control">
          <Modal.Title className="text-body font-semibold">이모지 추가</Modal.Title>
          <Modal.Close asChild>
            <Button variant="neutral" size="small" aria-label="이모지 선택창 닫기">
              닫기
            </Button>
          </Modal.Close>
        </div>
        <Modal.Description className="shrink-0 text-caption text-fg-neutral-muted">
          선택하면 새 레이어로 추가돼요. 카오모지는 문자로 만든 이모티콘이에요.
        </Modal.Description>
        <div className="shrink-0">
          <SegmentedControl
            label="이모티콘 종류"
            value={mode}
            options={[
              { value: "emoji", label: "이모지" },
              { value: "kaomoji", label: "카오모지" },
            ]}
            onChange={(value) => {
              setMode(value);
              setLimit(120);
            }}
          />
        </div>
        <FormField.Label htmlFor="emoji-search" className="sr-only">
          이모티콘 검색
        </FormField.Label>
        <Input
          id="emoji-search"
          ref={searchInput}
          type="search"
          className="shrink-0"
          autoComplete="off"
          spellCheck={false}
          placeholder={mode === "emoji" ? "검색: 웃음, 고양이, heart…" : "검색: 기쁨, 인사, cat…"}
          value={query}
          onChange={(event) => {
            setFilters({ ...filters, [mode]: { query: event.target.value, category } });
            setLimit(120);
          }}
        />
        <div className="shrink-0">
          <Select
            value={category}
            onValueChange={(value) => {
              setFilters({ ...filters, [mode]: { query, category: value } });
              setLimit(120);
            }}
          >
            <Select.Trigger aria-label="이모티콘 분류" className="mt-0 w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">전체 분류</Select.Item>
              {(mode === "emoji" ? emojiCategories : kaomojiCategories).map((item) => (
                <Select.Item key={item.value} value={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <p
          role="status"
          className="flex shrink-0 items-center gap-control text-caption text-fg-neutral-muted"
        >
          {mode === "emoji" && loading ? (
            <>
              <Spinner /> 이모지 목록 불러오는 중…
            </>
          ) : mode === "emoji" && !catalog ? null : (
            `${results.length}개${results.length > limit ? ` 중 ${limit}개 표시` : ""}`
          )}
        </p>
        <div
          key={`${mode}-${category}-${deferredQuery}`}
          role="group"
          aria-label="이모티콘 검색 결과"
          aria-busy={mode === "emoji" && loading}
          className="min-h-24 flex-1 overflow-y-auto overscroll-contain rounded-panel border border-stroke-neutral bg-bg-neutral-weak p-1"
        >
          {mode === "emoji" && error && (
            <div className="space-y-inset p-inset">
              <p role="alert" className="text-caption text-fg-critical">
                {error}
              </p>
              <Button variant="white" size="small" onClick={() => void loadCatalog()}>
                목록 다시 불러오기
              </Button>
            </div>
          )}
          {(mode === "kaomoji" || catalog) && !results.length && (
            <div className="space-y-inset p-inset">
              <p className="text-label text-fg-neutral-muted">일치하는 이모티콘이 없어요.</p>
              <Button
                variant="white"
                size="small"
                onClick={() => {
                  setFilters({ ...filters, [mode]: { query: "", category: "all" } });
                  setLimit(120);
                  searchInput.current?.focus();
                }}
              >
                검색·필터 초기화
              </Button>
            </div>
          )}
          <div
            className={
              mode === "emoji"
                ? "grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-control"
                : "grid grid-cols-2 gap-control max-[360px]:grid-cols-1"
            }
          >
            {results.slice(0, limit).map((option) => (
              <Button
                key={option.text}
                variant="white"
                aria-label={`${option.label} ${option.text} 추가`}
                title={option.label}
                className={
                  mode === "emoji"
                    ? "min-h-12 min-w-0 px-0 text-[28px]"
                    : "min-h-20 min-w-0 flex-col gap-control px-2 py-inset"
                }
                onClick={() => {
                  setOpen(false);
                  onAdd(option.text);
                }}
              >
                <span
                  className={mode === "emoji" ? "" : "text-lg wrap-anywhere"}
                  style={{ fontFamily: '"Pretendard", sans-serif', fontWeight: 600 }}
                >
                  {option.text}
                </span>
                {mode === "kaomoji" && (
                  <span className="text-caption font-normal text-fg-neutral-muted">
                    {option.label}
                  </span>
                )}
              </Button>
            ))}
          </div>
          {results.length > limit && (
            <Button
              variant="neutral"
              className="mt-inset w-full"
              onClick={() => setLimit(limit + 120)}
            >
              더 보기
            </Button>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
}
