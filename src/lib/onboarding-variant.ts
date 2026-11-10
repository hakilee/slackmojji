// One assignment per page load, even when storage is blocked or React remounts.
export const onboardingVariant = (() => {
  try {
    const saved = localStorage.getItem("slackmojji:onboarding:variant:v1");
    if (saved === "spotlight" || saved === "overview") return saved;
  } catch {
    // Private browsing/storage policy must not block onboarding.
  }
  const variant = Math.random() < 0.5 ? "spotlight" : "overview";
  try {
    localStorage.setItem("slackmojji:onboarding:variant:v1", variant);
  } catch {
    // The assignment remains stable in memory for this page load.
  }
  return variant;
})();
