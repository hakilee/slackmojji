import { useEffect, useState } from "react";
import { Button, Tabs, Spinner, toast } from "~/components/design-system";

interface Item {
  id: string;
  created_at: number;
  downloads: number;
  filename: string;
}
export function MochiGallery() {
  const [sort, setSort] = useState("recent");
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/mochi?sort=${sort}&offset=${offset}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("목록을 불러오지 못했어요.");
        const data = (await response.json()) as { items: Item[]; nextOffset: number | null };
        if (controller.signal.aborted) return;
        setItems((previous) =>
          offset === 0
            ? data.items
            : [
                ...previous,
                ...data.items.filter(
                  (item) => !previous.some((existing) => existing.id === item.id),
                ),
              ],
        );
        setNext(data.nextOffset);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("목록을 불러오지 못했어요. 다시 시도해 주세요.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sort, offset, retry]);
  async function download(id: string, filename: string) {
    setDownloading(id);
    setDownloadError("");
    try {
      const response = await fetch(`/api/mochi/${id}/download`, {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "잠시 후 다시 다운로드해 주세요."
            : "다운로드하지 못했어요. 다시 눌러 주세요.",
        );
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setItems((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, downloads: item.downloads + 1 } : item,
        ),
      );
      toast("모찌를 다운로드했어요.", { id: "mochi-download" });
      setOffset(0);
      setRetry((value) => value + 1);
      setLoading(true);
      setError("");
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "다운로드하지 못했어요.");
    } finally {
      setDownloading(null);
    }
  }
  return (
    <section
      aria-label="모찌 갤러리"
      className="mt-section rounded-workspace border border-stroke-neutral bg-bg-layer-default shadow-control p-panel max-[760px]:p-group"
    >
      <h2 className="text-body font-semibold">모두의 모찌</h2>
      <Tabs
        value={sort}
        onValueChange={(value) => {
          setSort(value);
          setOffset(0);
          setItems([]);
          setLoading(true);
          setError("");
        }}
        className="mt-group"
      >
        <Tabs.List aria-label="모찌 정렬">
          <Tabs.Trigger value="recent" className="focus-visible:outline-none">
            최근
          </Tabs.Trigger>
          <Tabs.Trigger value="popular" className="focus-visible:outline-none">
            랭킹
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value={sort}>
          <div className="grid grid-cols-6 gap-group max-[1000px]:grid-cols-4 max-[600px]:grid-cols-2">
            {items.map((item) => (
              <Button
                key={item.id}
                variant="white"
                className="h-auto flex-col gap-inset p-group"
                disabled={downloading !== null}
                aria-label={`모찌 다운로드 · ${item.downloads}회`}
                onClick={() => void download(item.id, item.filename)}
              >
                <img
                  src={`/api/mochi/${item.id}/image`}
                  alt=""
                  width={128}
                  height={128}
                  loading="lazy"
                  className="aspect-square w-full max-w-32 object-contain"
                />
                <span className="text-caption text-fg-neutral-muted">
                  {downloading === item.id
                    ? "다운로드 중…"
                    : `↓ ${item.downloads.toLocaleString()}`}
                </span>
              </Button>
            ))}
          </div>
          {(loading || error || !items.length) && (
            <div className="flex min-h-32 flex-col items-center justify-center gap-inset text-center">
              {loading && <Spinner />}
              <p role="status" className="text-label text-fg-neutral-muted">
                {error ||
                  (loading
                    ? "모찌를 불러오는 중…"
                    : items.length
                      ? ""
                      : "아직 공개된 모찌가 없어요. 첫 모찌를 만들어 보세요!")}
              </p>
              {error && (
                <Button
                  variant="white"
                  onClick={() => {
                    setRetry((value) => value + 1);
                    setLoading(true);
                    setError("");
                  }}
                >
                  다시 시도
                </Button>
              )}
            </div>
          )}
          {!loading && !error && next !== null && (
            <Button
              variant="white"
              className="mt-group"
              onClick={() => {
                setOffset(next);
                setLoading(true);
                setError("");
              }}
            >
              더 보기
            </Button>
          )}
        </Tabs.Content>
      </Tabs>
      <p role="status" className="text-caption text-fg-neutral-muted empty:hidden">
        {downloadError}
      </p>
    </section>
  );
}
