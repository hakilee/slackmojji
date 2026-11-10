import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Popover } from "~/components/design-system";

const steps = [
  {
    target: "#work-canvas",
    title: "여기가 편집하는 캔버스예요",
    body: "글자를 눌러 옮기고, 모서리를 드래그해 크기를 바꿔보세요. 모바일에서는 탭으로 선택한 뒤 다시 드래그해요.",
  },
  {
    target: "#onboarding-effects",
    title: "움직임을 더해보세요",
    body: "효과를 고르면 모찌가 움직여요. 속도와 반복 딜레이도 조절할 수 있어요. ‘없음’을 고르면 정지 이미지로 저장해요.",
  },
  {
    target: "#onboarding-preview",
    title: "실제 크기로 확인하고 다운로드해요",
    body: "Slack 반응 크기와 확대 화면을 비교해보세요. ‘모두의 모찌에 공개’를 끄면 내 기기에만 다운로드해요.",
  },
];

export function EditorOnboarding() {
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem("slackmojji:onboarding:v1");
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const scroll = useRef(0);
  const anchor = useMemo(
    () => ({ current: { getBoundingClientRect: () => rect ?? new DOMRect() } }),
    [rect],
  );

  function finish(status: "completed" | "skipped") {
    try {
      localStorage.setItem("slackmojji:onboarding:v1", status);
    } catch {
      // Storage can be unavailable; dismissal must still work.
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    scroll.current = window.scrollY;
    return () => window.scrollTo({ top: scroll.current, behavior: "instant" });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = document.querySelector(steps[step].target);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "instant" });
    const update = () => setRect(target.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [open, step]);

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(value) => {
        if (value) {
          setStep(0);
          setOpen(true);
        } else finish("skipped");
      }}
    >
      <Popover.Trigger asChild>
        <Button ref={trigger} variant="white">
          사용법
        </Button>
      </Popover.Trigger>
      <Popover.Anchor virtualRef={anchor} />
      {open && rect && (
        <Popover.Provider>
          <div>
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-50 rounded-panel border-2 border-stroke-focus"
              style={{
                left: rect.left - 4,
                top: rect.top - 4,
                width: rect.width + 8,
                height: rect.height + 8,
                boxShadow: "0 0 0 9999px rgb(0 0 0 / 45%)",
              }}
            />
            <Popover.Content
              side={window.innerWidth > 1000 ? "right" : "bottom"}
              sideOffset={16}
              collisionPadding={12}
              aria-labelledby="onboarding-title"
              aria-describedby="onboarding-description"
              className="z-50 w-80 max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-group"
              onInteractOutside={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                trigger.current?.focus({ preventScroll: true });
              }}
            >
              <h2 id="onboarding-title" className="text-body font-semibold">
                {steps[step].title}
              </h2>
              <p
                id="onboarding-description"
                className="mt-control text-label text-fg-neutral-secondary"
              >
                {steps[step].body}
              </p>
              <div className="mt-group flex items-center gap-control">
                <span className="mr-auto text-caption text-fg-neutral-muted" aria-live="polite">
                  {step + 1} / {steps.length}
                </span>
                <Button variant="white" onClick={() => finish("skipped")}>
                  건너뛰기
                </Button>
                <Button
                  onClick={() =>
                    step === steps.length - 1 ? finish("completed") : setStep(step + 1)
                  }
                >
                  {step === steps.length - 1 ? "시작하기" : "다음"}
                </Button>
              </div>
            </Popover.Content>
          </div>
        </Popover.Provider>
      )}
    </Popover>
  );
}
