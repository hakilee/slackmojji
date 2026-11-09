import { useEffect, useMemo, useRef, useState } from "react";
import { recipeSchema } from "~/lib/mochi-recipe";
import { observeRecipeCanvas } from "~/lib/mochi-recipe-client";

export function RecipePreview({ recipe }: { recipe: unknown }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parsed = useMemo(() => recipeSchema.safeParse(recipe), [recipe]);
  const [error, setError] = useState<{ recipe: unknown; message: string } | null>(null);
  const message = !parsed.success
    ? "지원하지 않는 설정이에요."
    : error && error.recipe === recipe
      ? error.message
      : "";
  useEffect(() => {
    if (!parsed.success || !canvas.current) return;
    return observeRecipeCanvas(canvas.current, parsed.data, (cause) => {
      setError({
        recipe,
        message: cause instanceof Error ? cause.message : "미리보기를 불러오지 못했어요.",
      });
    });
  }, [parsed, recipe]);
  return (
    <div className="relative aspect-square w-full max-w-32">
      <canvas
        ref={canvas}
        width={128}
        height={128}
        aria-label="텍스트 모찌 미리보기"
        className="size-full"
      />
      {message && (
        <span className="absolute inset-0 flex items-center justify-center text-caption text-fg-critical">
          {message}
        </span>
      )}
    </div>
  );
}
