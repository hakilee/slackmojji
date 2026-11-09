// Initialize once per page load, not on editor renders or React StrictMode remounts.
export const previewUser = (() => {
  const names = [
    "Gene (진)",
    "Izy (이지)",
    "Rubato (루바토)",
    "Loopy (루피)",
    "Everett (에버렛)",
    "Orra (오라)",
    "Coke (코크)",
    "Cola (콜라)",
  ];
  const avatars = [
    "triple-lens",
    "pearl-leaves",
    "tri-axial-weave",
    "braided-disc",
    "crossed-petals",
    "five-lobe-vortex",
    "six-tile-halo",
    "pillow-braid",
    "four-lens-orbit",
    "five-cushions",
    "five-capsule-star",
    "leaf-crown",
  ];
  let previous: string | null = null;
  try {
    previous = sessionStorage.getItem("slackmojji-preview-user");
  } catch {
    // Storage can be unavailable; the preview still works with a random identity.
  }
  const availableNames = names.filter((name) => name !== previous?.split("|").at(0));
  const availableAvatars = avatars.filter((avatar) => avatar !== previous?.split("|").at(1));
  const name = availableNames[Math.floor(Math.random() * availableNames.length)];
  const avatar = availableAvatars[Math.floor(Math.random() * availableAvatars.length)];
  try {
    sessionStorage.setItem("slackmojji-preview-user", `${name}|${avatar}`);
  } catch {
    // Persisting the previous choice is optional, never a prerequisite for editing.
  }
  return { name, avatar: `/preview-avatars/${avatar}-light.svg` };
})();
