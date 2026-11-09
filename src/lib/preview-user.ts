// Initialize once per page load, not on editor renders or React StrictMode remounts.
export const previewUser = (() => {
  const profiles = [
    { name: "Gene (진)", avatar: "triple-lens" },
    { name: "Izy (이지)", avatar: "pearl-leaves" },
    { name: "Rubato (루바토)", avatar: "tri-axial-weave" },
    { name: "Loopy (루피)", avatar: "braided-disc" },
    { name: "Everett (에버렛)", avatar: "crossed-petals" },
    { name: "Orra (오라)", avatar: "five-lobe-vortex" },
    { name: "Coke (코크)", avatar: "six-tile-halo" },
    { name: "Cola (콜라)", avatar: "pillow-braid" },
    { name: "Ria (리아)", avatar: "four-lens-orbit" },
    { name: "Crong (크롱)", avatar: "five-cushions" },
    { name: "Chloe (클로이)", avatar: "five-capsule-star" },
    { name: "Hailey (헤일리)", avatar: "leaf-crown" },
  ];
  let previous: string | null = null;
  try {
    previous = sessionStorage.getItem("slackmojji-preview-user");
  } catch {
    // Storage can be unavailable; the preview still works with a random identity.
  }
  const availableProfiles = profiles.filter((profile) => profile.name !== previous);
  const { name, avatar } = availableProfiles[Math.floor(Math.random() * availableProfiles.length)];
  try {
    sessionStorage.setItem("slackmojji-preview-user", name);
  } catch {
    // Persisting the previous choice is optional, never a prerequisite for editing.
  }
  return { name, avatar: `/preview-avatars/${avatar}-light.svg` };
})();
