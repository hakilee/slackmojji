import {
  Modal,
  ArrowUpIcon,
  WorldIcon,
  FormField,
  Button,
  Checkbox,
  ChoiceButton,
  Input,
  Spinner,
} from "~/components/design-system";
import { startTransition, useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { fonts } from "../../lib/emoji";
import fontCatalogUrl from "../../data/google-fonts.json?url";
import { loadFont } from "~/lib/font-loading";

export function FontPicker({
  font,
  fontLabel,
  uploadedFont,
  onUpload,
  onChange,
  onLoading,
}: {
  font: string;
  fontLabel?: string;
  uploadedFont: { family: string; label: string } | null;
  onUpload: (font: { family: string; label: string; face: FontFace }) => void;
  onChange: (font: string, label?: string) => void;
  onLoading: (loading: boolean) => void;
}) {
  const [catalog, setCatalog] = useState<{ family: string; korean: boolean }[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [koreanOnly, setKoreanOnly] = useState(true);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const triggerId = useId();
  const uploadId = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const pendingFont = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const search = useDeferredValue(query.trim().toLowerCase());
  const results = (catalog ?? []).filter(
    (item) => (!koreanOnly || item.korean) && item.family.toLowerCase().includes(search),
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pendingFont.current?.abort();
      onLoading(false);
    };
  }, [onLoading]);

  async function loadCatalog() {
    if (catalog || catalogLoading) return;
    setCatalogLoading(true);
    setRemoteError("");
    try {
      const response = await fetch(fontCatalogUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("font catalog unavailable");
      const families: { family: string; korean: boolean }[] = await response.json();
      if (mounted.current) startTransition(() => setCatalog(families));
    } catch {
      if (mounted.current) setRemoteError("글꼴 목록을 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      if (mounted.current) setCatalogLoading(false);
    }
  }

  async function selectFont(family: string) {
    const request = new AbortController();
    pendingFont.current = request;
    setLoading(family);
    setRemoteError("");
    onLoading(true);
    const link = document.createElement("link");
    request.signal.addEventListener("abort", () => link.remove(), { once: true });
    let applied = false;
    try {
      if (!fonts.includes(family)) {
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?${new URLSearchParams({ family, display: "swap" })}`;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          await new Promise<void>((resolve, reject) => {
            timeout = setTimeout(() => reject(new Error("timeout")), 15000);
            request.signal.addEventListener("abort", () => reject(request.signal.reason), {
              once: true,
            });
            link.onload = () => resolve();
            link.onerror = () => reject(new Error("network"));
            document.head.append(link);
          });
        } finally {
          clearTimeout(timeout);
          link.onload = null;
          link.onerror = null;
        }
      }
      request.signal.throwIfAborted();
      const loaded = await loadFont(family, "가나다Aa");
      request.signal.throwIfAborted();
      if (!loaded.length) throw new Error("font unavailable");
      if (!mounted.current) return;
      onChange(family);
      applied = true;
      setOpen(false);
    } catch {
      if (mounted.current && !request.signal.aborted)
        setRemoteError("글꼴을 불러오지 못했어요. 연결을 확인하고 다시 선택해 주세요.");
    } finally {
      if (!applied) link.remove();
      if (pendingFont.current === request) {
        pendingFont.current = null;
        if (mounted.current) {
          setLoading("");
          onLoading(false);
        }
      }
    }
  }

  return (
    <>
      <div className="grid gap-control">
        {fonts.map((family) => (
          <ChoiceButton
            className="flex items-center justify-between gap-control overflow-hidden text-left [&_small]:text-caption [&_small]:text-fg-neutral-muted [&_small]:wrap-anywhere"
            key={family}
            disabled={!!loading}
            selected={font === family}
            onClick={() => {
              setError("");
              onChange(family);
            }}
          >
            <span
              className="shrink-0 text-[22px] whitespace-nowrap max-[760px]:text-lg"
              style={{ fontFamily: family }}
            >
              가나다 Aa
            </span>
            <small>{family}</small>
          </ChoiceButton>
        ))}
      </div>
      <div className="mt-inset grid grid-cols-2 gap-control">
        <div className="relative min-w-0 rounded-xl focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
          <Button asChild variant="neutral" disabled={!!loading} className="h-full w-full px-2">
            <FormField.Label htmlFor={uploadId}>
              <ArrowUpIcon aria-hidden="true" className="size-4 shrink-0" />
              폰트 업로드
            </FormField.Label>
          </Button>
          <Input
            id={uploadId}
            className="sr-only top-0 left-0 size-px border-0 p-0"
            type="file"
            accept=".otf,.ttf,.woff,.woff2"
            disabled={!!loading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setLoading("upload");
              setError("");
              onLoading(true);
              try {
                if (!/\.(?:otf|ttf|woff2?)$/i.test(file.name)) throw new Error("format");
                const family = `slackmojji-upload-${crypto.randomUUID()}`;
                const label = `${file.name} (업로드)`;
                const face = await new FontFace(family, await file.arrayBuffer()).load();
                if (!mounted.current) return;
                onUpload({ family, label, face });
                onChange(family, label);
              } catch {
                if (mounted.current)
                  setError(
                    "폰트를 불러오지 못했어요. 올바른 OTF, TTF, WOFF 또는 WOFF2 파일을 선택해 주세요.",
                  );
              } finally {
                if (mounted.current) {
                  setLoading("");
                  onLoading(false);
                }
              }
            }}
          />
        </div>
        <Modal
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) {
              setError("");
              setRemoteError("");
              void loadCatalog();
            } else if (pendingFont.current) {
              pendingFont.current.abort();
              pendingFont.current = null;
              setLoading("");
              onLoading(false);
            }
          }}
        >
          <Modal.Trigger id={triggerId} disabled={!!loading} asChild>
            <Button variant="neutral" className="w-full min-w-0 px-2">
              <WorldIcon aria-hidden="true" className="size-4 shrink-0" />
              Google Fonts
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
              <Modal.Title className="min-w-0 text-body font-semibold">Google Fonts</Modal.Title>
              <Modal.Close aria-label="Google Fonts 닫기" asChild>
                <Button variant="neutral" size="small">
                  닫기
                </Button>
              </Modal.Close>
            </div>
            <Modal.Description className="shrink-0 text-caption text-fg-neutral-muted wrap-anywhere">
              현재 글꼴 · {fontLabel ?? font}
            </Modal.Description>
            <FormField.Label className="sr-only" htmlFor="font-search">
              Google Fonts 검색
            </FormField.Label>
            <Input
              id="font-search"
              ref={searchInput}
              className="shrink-0"
              type="search"
              name="font-search"
              autoComplete="off"
              spellCheck={false}
              placeholder="예: Gaegu…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="shrink-0">
              <Checkbox
                label="한글 지원"
                checked={koreanOnly}
                onCheckedChange={(checked) => startTransition(() => setKoreanOnly(checked))}
              />
            </div>
            <div
              className="min-h-24 flex-1 space-y-control overflow-y-auto overscroll-contain rounded-panel border border-stroke-neutral bg-bg-neutral-weak p-1"
              role="group"
              aria-label="검색 결과"
              aria-busy={catalogLoading}
            >
              {results.slice(0, 40).map(({ family }) => (
                <ChoiceButton
                  className="flex w-full items-center justify-between gap-control text-left wrap-anywhere"
                  key={family}
                  disabled={!!loading}
                  aria-busy={loading === family}
                  selected={font === family}
                  onClick={() => void selectFont(family)}
                >
                  <span className="text-label">{family}</span>
                  <span className="inline-flex shrink-0 items-center gap-control text-caption">
                    {loading === family && <Spinner />}
                    {loading === family ? "불러오는 중…" : font === family ? "선택됨" : "+"}
                  </span>
                </ChoiceButton>
              ))}
              {catalog && !results.length && (
                <p className="mt-2 text-xs text-fg-neutral-muted">일치하는 글꼴이 없어요.</p>
              )}
            </div>
            <p
              className="flex shrink-0 items-center gap-control text-caption text-fg-neutral-muted"
              role="status"
            >
              {(catalogLoading || loading) && <Spinner />}
              {loading
                ? `${loading} 불러오는 중…`
                : catalogLoading
                  ? "글꼴 목록 불러오는 중…"
                  : !catalog
                    ? ""
                    : results.length > 40
                      ? `${results.length}개 중 40개 표시 · 검색어를 더 입력해 주세요.`
                      : `${results.length}개 글꼴`}
            </p>
            {remoteError && (
              <div className="shrink-0 space-y-control">
                <p role="alert" className="text-caption text-fg-critical">
                  {remoteError}
                </p>
                {!catalog && (
                  <Button variant="white" size="small" onClick={() => void loadCatalog()}>
                    목록 다시 불러오기
                  </Button>
                )}
              </div>
            )}
          </Modal.Content>
        </Modal>
      </div>
      <div className="mt-control space-y-control">
        {loading === "upload" && (
          <p
            role="status"
            className="flex items-center gap-control text-caption text-fg-neutral-muted"
          >
            <Spinner /> 폰트 불러오는 중…
          </p>
        )}
        {uploadedFont && (
          <ChoiceButton
            disabled={!!loading}
            selected={font === uploadedFont.family}
            className="w-full text-left wrap-anywhere"
            onClick={() => {
              setError("");
              onChange(uploadedFont.family, uploadedFont.label);
            }}
          >
            {uploadedFont.label}
          </ChoiceButton>
        )}
      </div>
      {!fonts.includes(font) && (
        <p className="mt-2 text-xs text-fg-neutral-muted">선택한 글꼴 · {fontLabel ?? font}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-fg-critical">
          {error}
        </p>
      )}
    </>
  );
}
