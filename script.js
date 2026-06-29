const root = document.documentElement;
const yearNodes = [document.getElementById("year"), document.getElementById("year-en")];
const langToggle = document.querySelector("[data-lang-toggle]");

function setLanguage(language) {
  const nextLanguage = language === "en" ? "en" : "zh";
  root.dataset.currentLang = nextLanguage;
  root.lang = nextLanguage === "zh" ? "zh-CN" : "en";

  if (langToggle) {
    langToggle.textContent = langToggle.dataset[nextLanguage === "zh" ? "labelZh" : "labelEn"];
    langToggle.setAttribute(
      "aria-label",
      nextLanguage === "zh" ? "Switch to English" : "切换到中文"
    );
  }

  localStorage.setItem("homepage-language", nextLanguage);
}

yearNodes.forEach((node) => {
  if (node) {
    node.textContent = new Date().getFullYear().toString();
  }
});

if (langToggle) {
  langToggle.addEventListener("click", () => {
    const currentLanguage = root.dataset.currentLang === "en" ? "en" : "zh";
    setLanguage(currentLanguage === "zh" ? "en" : "zh");
  });
}

setLanguage(localStorage.getItem("homepage-language") || "zh");
