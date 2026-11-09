// Initialize once per page load, not on editor renders or React StrictMode remounts.
export const previewUser = (() => {
  const profiles = [
    { name: "Gene (진)", avatar: "gene" },
    { name: "Izy (이지)", avatar: "izy" },
    { name: "Rubato (루바토)", avatar: "rubato" },
    { name: "Loopy (루피)", avatar: "loopy" },
    { name: "Everett (에버렛)", avatar: "everett" },
    { name: "Orra (오라)", avatar: "orra" },
    { name: "Coke (코크)", avatar: "coke" },
    { name: "Cola (콜라)", avatar: "cola" },
    { name: "Ria (리아)", avatar: "ria" },
    { name: "Crong (크롱)", avatar: "crong" },
    { name: "Chloe (클로이)", avatar: "chloe" },
    { name: "Hailey (헤일리)", avatar: "hailey" },
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
  return { name, avatar: `/preview-avatars/${avatar}.webp` };
})();
