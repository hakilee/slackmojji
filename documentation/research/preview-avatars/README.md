# Character preview portraits (#211)

Twelve original fictional animal portraits generated with the built-in image_gen tool, replacing the superseded abstract Iconloom SVGs. Names remain fixed to the corresponding portrait; the selected profile changes only on page load. These are not likenesses of real people. No branded characters or logos were requested.

The exact final prompt set is in [prompts.json](prompts.json). Shared direction: soft 3D clay-style animal faces, tactile matte surfaces, expressive eyes, pastel backgrounds, neckerchiefs, centered square portrait readable at 36px. All twelve generated outputs were visually reviewed before use; no artistic edits were applied.

| Name             | Character             | Asset        |
| ---------------- | --------------------- | ------------ |
| Gene (진)        | Cream fox             | gene.webp    |
| Izy (이지)       | Lavender rabbit       | izy.webp     |
| Rubato (루바토)  | Caramel bear cub      | rubato.webp  |
| Loopy (루피)     | Apricot otter         | loopy.webp   |
| Everett (에버렛) | Slate-blue owl        | everett.webp |
| Orra (오라)      | White arctic fox      | orra.webp    |
| Coke (코크)      | Charcoal kitten       | coke.webp    |
| Cola (콜라)      | Cinnamon red panda    | cola.webp    |
| Ria (리아)       | Peach-pink fawn       | ria.webp     |
| Crong (크롱)     | Mint baby dragon      | crong.webp   |
| Chloe (클로이)   | Cream longhair kitten | chloe.webp   |
| Hailey (헤일리)  | Golden puppy          | hailey.webp  |

Final assets live in `public/preview-avatars/`. Each generated square PNG was resized to 256×256 and encoded to WebP using the already-installed Sharp package (quality 85, effort 6). This is format/size conversion, not a new image-generation implementation or runtime dependency. Original generation files remain outside Git; final application assets and prompts are committed. Generation is not deterministic replay.
