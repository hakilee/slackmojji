// One page-load choice shared by the initial composition and subsequently added text.
export const initialTextColor = (() => {
  const colors = [
    "#7555e8",
    "#2563eb",
    "#0f766e",
    "#15803d",
    "#b45309",
    "#c2410c",
    "#be123c",
    "#a21caf",
  ];
  let previous: string | null = null;
  try {
    previous = sessionStorage.getItem("slackmojji-text-color");
  } catch {
    // Choosing a color must not depend on browser storage availability.
  }
  const available = colors.filter((color) => color !== previous);
  const color = available[Math.floor(Math.random() * available.length)];
  try {
    sessionStorage.setItem("slackmojji-text-color", color);
  } catch {
    // Without storage, random selection still works but may repeat on reload.
  }
  return color;
})();
