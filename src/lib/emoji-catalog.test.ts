import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import emojis from "emojibase-data/ko/compact.json";
import shortcodes from "emojibase-data/en/shortcodes/emojibase.json";
import emojisUrl from "emojibase-data/ko/compact.json?url";
import { emojiCategories, loadEmojiCatalog } from "./emoji-catalog";
import { constrainText, validateText } from "./emoji";

describe("emoji catalog [E5ak]", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (url: string) =>
          new Response(JSON.stringify(url === emojisUrl ? emojis : shortcodes)),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  test.each(["network", "http", "json"])(
    "retries after a %s failure without a page reload",
    async (failure) => {
      if (failure === "network") vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
      else
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response("unavailable", { status: failure === "http" ? 503 : 200 }),
        );

      await expect(loadEmojiCatalog()).rejects.toThrow();
      const recovered = await loadEmojiCatalog();

      expect(recovered.find((option) => option.text === "👍🏽")).toMatchObject({ category: "1" });
    },
  );
  test("offers complete, independently insertable emoji with valid categories", async () => {
    const emojiOptions = await loadEmojiCatalog();
    const categories = new Set(emojiCategories.map((category) => category.value));

    expect(new Set(emojiOptions.map((option) => option.text)).size).toBe(emojiOptions.length);
    for (const option of emojiOptions) {
      expect(categories.has(option.category)).toBe(true);
      expect(option.label.trim()).not.toBe("");
      expect(validateText(option.text)).toBeNull();
      expect(constrainText(option.text)).toBe(option.text);
    }
    expect(emojiOptions.some((option) => option.text === "🇦" || option.text === "🏻")).toBe(false);
    expect(emojiOptions.find((option) => option.text === "🇰🇷")?.category).toBe("9");
  });
});
