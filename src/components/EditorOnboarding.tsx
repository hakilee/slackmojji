import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, MotionIcon, Popover } from "~/components/design-system";
import { onboardingVariant } from "~/lib/onboarding-variant";
import styles from "./EditorOnboarding.module.css";

const steps = [
  {
    target: "#work-canvas",
    title: "캔버스에서 편집해요",
    body: "탭으로 선택한 뒤 드래그해 이동해요. 모서리를 끌면 크기가 바뀌어요.",
  },
  {
    target: "#onboarding-effects",
    title: "움직임을 더해요",
    body: "효과를 고르고 속도를 조절해요. ‘없음’은 정지 이미지예요.",
  },
  {
    target: "#onboarding-preview",
    title: "확인하고 다운로드해요",
    body: "Slack 크기로 확인해요. 공개를 끄면 내 기기에만 저장해요.",
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
    () => ({
      current: {
        getBoundingClientRect: () => {
          if (window.innerWidth > 1000) return rect ?? new DOMRect();
          const viewport = window.visualViewport;
          return new DOMRect(
            (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) / 2,
            (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 12,
            0,
            0,
          );
        },
      },
    }),
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
    if (!open || onboardingVariant !== "spotlight") return;
    const target = document.querySelector(steps[step].target);
    if (!target) return;
    target.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
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

  const guideButton = (
    <Button ref={trigger} variant="white" size="small" svgOnly aria-label="사용법" title="사용법">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="size-4"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16h.01" />
      </svg>
    </Button>
  );

  if (onboardingVariant === "overview") {
    return (
      <Modal open={open} onOpenChange={(value) => (value ? setOpen(true) : finish("skipped"))}>
        <Modal.Trigger asChild>{guideButton}</Modal.Trigger>
        <Modal.Content
          className="max-w-190 overflow-y-auto max-[760px]:w-[calc(100%-24px)]"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus({ preventScroll: true });
          }}
        >
          <Modal.Title>나만의 모찌, 이렇게 만들어요</Modal.Title>
          <Modal.Description className="mt-control text-label text-fg-neutral-secondary">
            캔버스에서 꾸미고, Slack 크기로 확인한 뒤 저장해요.
          </Modal.Description>
          <ol className="my-group grid grid-cols-3 gap-group max-[600px]:grid-cols-1">
            <li className="flex flex-col gap-control">
              <div
                aria-hidden="true"
                className="flex h-28 items-center justify-center rounded-control bg-bg-checker-base bg-[conic-gradient(var(--color-bg-checker-tile)_25%,transparent_0_50%,var(--color-bg-checker-tile)_0_75%,transparent_0)] bg-size-[16px_16px]"
              >
                <span className="border border-stroke-focus px-control text-xl font-bold text-fg-brand">
                  좋아요
                </span>
              </div>
              <h3 className="text-body font-semibold">1. 캔버스에서 편집</h3>
              <p className="text-label text-fg-neutral-secondary">
                텍스트나 이미지를 추가하고, 크기와 위치를 조절해요.
              </p>
            </li>
            <li className="flex flex-col gap-control">
              <div
                aria-hidden="true"
                className="flex h-28 items-center justify-center rounded-control bg-bg-neutral-weak"
              >
                <MotionIcon motion="swing" />
              </div>
              <h3 className="text-body font-semibold">2. 움직임 더하기</h3>
              <p className="text-label text-fg-neutral-secondary">
                효과와 속도를 골라 움직이는 모찌를 만들어요.
              </p>
            </li>
            <li className="flex flex-col gap-control">
              <div
                aria-hidden="true"
                className="flex h-28 items-center justify-center rounded-control bg-bg-neutral-weak"
              >
                <span className="rounded-full border border-stroke-neutral px-group py-control text-label">
                  좋아요 1
                </span>
              </div>
              <h3 className="text-body font-semibold">3. 확인하고 다운로드</h3>
              <p className="text-label text-fg-neutral-secondary">
                Slack 반응 크기로 확인해요. 공개를 끄면 내 기기에만 저장해요.
              </p>
            </li>
          </ol>
          <div className="mt-group flex flex-wrap justify-end gap-control">
            <Button variant="white" onClick={() => finish("skipped")}>
              나중에 볼게요
            </Button>
            <Button onClick={() => finish("completed")}>모찌 만들기</Button>
          </div>
        </Modal.Content>
      </Modal>
    );
  }

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
      <Popover.Trigger asChild>{guideButton}</Popover.Trigger>
      <Popover.Anchor virtualRef={anchor} />
      {open && rect && (
        <Popover.Provider>
          <div className={styles.panel}>
            <div
              aria-hidden="true"
              className={`${styles.highlight} pointer-events-none fixed z-50 rounded-panel border-2 border-stroke-focus`}
              style={{
                left: rect.left - 4,
                top: rect.top - 4,
                width: rect.width + 8,
                height: rect.height + 8,
                boxShadow: "0 0 0 9999px rgb(0 0 0 / 45%)",
              }}
            />
            <Popover.Content
              side={window.innerWidth > 1000 ? "right" : "top"}
              sideOffset={window.innerWidth > 1000 ? 16 : 0}
              avoidCollisions={window.innerWidth > 1000}
              updatePositionStrategy="always"
              collisionPadding={12}
              aria-labelledby="onboarding-title"
              aria-describedby="onboarding-description"
              className="z-50 w-80 max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-y-auto p-3"
              onInteractOutside={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                trigger.current?.focus({ preventScroll: true });
              }}
            >
              <div key={step} className={styles.copy}>
                <h2 id="onboarding-title" className="text-label font-semibold">
                  {steps[step].title}
                </h2>
                <p
                  id="onboarding-description"
                  className="mt-control text-label text-fg-neutral-secondary"
                >
                  {steps[step].body}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-control">
                <span className="mr-auto text-caption text-fg-neutral-muted" aria-live="polite">
                  {step + 1} / {steps.length}
                </span>
                <Button size="small" variant="white" onClick={() => finish("skipped")}>
                  건너뛰기
                </Button>
                <Button
                  size="small"
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
