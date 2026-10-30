(function () {
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const langToggle = document.querySelector("[data-lang-toggle]");
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  const STORAGE_KEY = "homepage-language";
  const VISIBLE_MONTHS = 4;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (error) {
      return null;
    }
    return null;
  }

  /* ---------- language ---------- */
  function setLanguage(language) {
    const next = language === "en" ? "en" : "zh";
    root.dataset.currentLang = next;
    root.lang = next === "zh" ? "zh-CN" : "en";

    if (langToggle) {
      langToggle.textContent = langToggle.dataset[next === "zh" ? "labelZh" : "labelEn"];
      langToggle.setAttribute("aria-label", next === "zh" ? "Switch to English" : "切换到中文");
    }
    if (menuToggle) {
      menuToggle.setAttribute("aria-label", next === "zh" ? "菜单" : "Menu");
    }
    updateMoreButton();
    if (typeof fitPhrases === "function") fitPhrases();
    store(STORAGE_KEY, next);
  }

  if (langToggle) {
    langToggle.addEventListener("click", () => {
      setLanguage(root.dataset.currentLang === "en" ? "zh" : "en");
    });
  }

  /* ---------- year ---------- */
  ["year", "year-en"].forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.textContent = String(new Date().getFullYear());
  });

  /* ---------- mobile menu ---------- */
  function setMenu(open) {
    if (!header || !menuToggle) return;
    header.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      setMenu(!header.classList.contains("is-open"));
    });
  }
  if (nav) {
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });
  document.addEventListener("click", (event) => {
    if (header && !header.contains(event.target)) setMenu(false);
  });

  /* ---------- events: newest first, older months folded ---------- */
  const timeline = document.querySelector(".event-timeline");
  let moreWrap = null;
  let hiddenCount = 0;

  function updateMoreButton() {
    if (!moreWrap) return;
    const button = moreWrap.querySelector("button");
    const en = root.dataset.currentLang === "en";
    button.textContent = en
      ? `Show earlier news (${hiddenCount} more months)`
      : `查看更早动态（还有 ${hiddenCount} 个月）`;
  }

  if (timeline) {
    const months = Array.from(timeline.querySelectorAll(":scope > .timeline-month"));
    months.reverse().forEach((month) => timeline.appendChild(month));

    timeline.querySelectorAll(".timeline-event-grid").forEach((grid) => {
      Array.from(grid.children).reverse().forEach((card) => grid.appendChild(card));
    });

    const older = months.slice(VISIBLE_MONTHS);
    hiddenCount = older.length;

    if (hiddenCount > 0) {
      older.forEach((month) => month.classList.add("is-collapsed"));
      moreWrap = document.createElement("div");
      moreWrap.className = "timeline-more";
      moreWrap.innerHTML = '<button type="button"></button>';
      timeline.after(moreWrap);
      moreWrap.querySelector("button").addEventListener("click", () => {
        older.forEach((month) => month.classList.remove("is-collapsed"));
        moreWrap.remove();
        moreWrap = null;
        fitPhrases();
      });
    }

    // Deep links (e.g. #event-2025-11-17) should still open folded months.
    function revealHash() {
      if (!location.hash) return;
      const target = document.getElementById(location.hash.slice(1));
      const month = target && target.closest(".timeline-month.is-collapsed");
      if (month && moreWrap) {
        moreWrap.querySelector("button").click();
        target.scrollIntoView();
      }
    }
    window.addEventListener("hashchange", revealHash);
    revealHash();
  }

  /* ---------- Chinese titles: break only between phrases ---------- */
  // Browsers may break Chinese between any two characters ("临床问 / 题").
  // For titles, names and short labels we split the text into phrases and
  // wrap each one in a no-wrap span, so a line can only end between phrases:
  //   1. split after punctuation, after 的, and before 与/和/及/并/或;
  //   2. phrases longer than 4 characters are split again into words with
  //      Intl.Segmenter, gluing any single leftover character to its
  //      neighbour (so never "李家 / 骏" or "跟腱 / 病").
  // Headings that contain hand-set .nw phrases are left untouched.
  const WORD_TARGETS = [
    "h1", "h2", "h3", ".role", ".status-label", ".member span",
    ".quick-facts dd", ".recent-update-list a", ".member-update summary"
  ].join(",");
  const HAN = /[\u3400-\u9fff]/;
  const HAN_ALL = /[\u3400-\u9fff]/g;
  let PHRASE_SPLIT = null;
  try {
    // built at runtime: lookbehind is a syntax error in iOS Safari < 16.4
    PHRASE_SPLIT = new RegExp("(?<=[、，；：。！？）》」』\\s])|(?=[（《「『])|(?<=的)|(?=[与和及并或])");
  } catch (error) {
    PHRASE_SPLIT = /(?=[（《「『与和及并或])/;
  }
  const segmenter =
    typeof Intl !== "undefined" && Intl.Segmenter
      ? new Intl.Segmenter("zh", { granularity: "word" })
      : null;

  // Terms that must never be split across lines. Add new ones here if a
  // title or label ever breaks in an awkward place.
  const KEEP_TOGETHER = [
    "浙江万里学院", "中心实验室", "静配中心", "结晶沉积", "跟腱修复",
    "临床医学", "口腔医学", "骨科学", "外科学", "学硕", "专硕", "学博",
    "本科生", "研究生", "研究员", "研究院", "博士后", "拔尖人才创新班",
    "鳞状细胞癌", "乳腺癌", "跟腱病", "炎症性疾病", "分子影像", "分子克隆", "数智生物",
    "文献检索", "文献解读", "实名认证", "线上分享", "汇报分享", "开题答辩",
    "Haijiao Lab", "YiFei Wan", "ChatGPT API", "PET/CT"
  ];

  // Glue units back together wherever a boundary falls inside a protected term.
  function protect(text, units) {
    const noBreak = new Set();
    KEEP_TOGETHER.forEach((term) => {
      let i = text.indexOf(term);
      while (i !== -1) {
        for (let k = i + 1; k < i + term.length; k++) noBreak.add(k);
        i = text.indexOf(term, i + 1);
      }
    });
    const out = [];
    let pos = 0;
    units.forEach((unit) => {
      if (out.length && noBreak.has(pos)) out[out.length - 1] += unit;
      else out.push(unit);
      pos += unit.length;
    });
    return out;
  }

  const hanCount = (text) => (text.match(HAN_ALL) || []).length;
  const isLoneHan = (text) => text.length === 1 && HAN.test(text);

  function splitLong(phrase) {
    if (!segmenter || hanCount(phrase) <= 4) return [phrase];
    // 1) consecutive single characters form one unit (静|配 → 静配)
    const units = [];
    let inRun = false;
    for (const { segment } of segmenter.segment(phrase)) {
      if (isLoneHan(segment)) {
        if (inRun) units[units.length - 1] += segment;
        else units.push(segment);
        inRun = true;
      } else {
        units.push(segment);
        inRun = false;
      }
    }
    // 2) a still-isolated character joins its neighbour (病理|性 → 病理性)
    const out = [];
    units.forEach((unit, i) => {
      if (isLoneHan(unit) && out.length) out[out.length - 1] += unit;
      else if (out.length && isLoneHan(units[i - 1]) && out.length === 1 && out[0].length === 1) out[0] += unit;
      else out.push(unit);
    });
    return out;
  }

  function phrases(text) {
    const parts = text.split(PHRASE_SPLIT).filter(Boolean);
    const units = parts.reduce((all, part) => all.concat(splitLong(part)), []);
    return protect(text, units);
  }

  function wrapPhrases(el) {
    if (el.querySelector(".nw, .w")) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (HAN.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
    }
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      phrases(node.nodeValue).forEach((part) => {
        if (part.trim().length > 1 && (HAN.test(part) || /\S\s\S/.test(part))) {
          const span = document.createElement("span");
          span.className = "w";
          span.textContent = part;
          frag.appendChild(span);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  try {
    document.querySelectorAll(WORD_TARGETS).forEach((el) => {
      if (el.closest('[data-lang="zh"]') || HAN.test(el.textContent)) wrapPhrases(el);
    });
  } catch (error) {
    /* older browsers: fall back to normal line breaking */
  }

  // Safety net: a phrase wider than its box (very narrow screens) is allowed
  // to wrap normally instead of overflowing.
  function fitPhrases() {
    document.querySelectorAll(".w, .nw").forEach((span) => {
      span.classList.remove("is-loose");
      const box = span.parentElement.closest("h1, h2, h3, p, li, dd, a, span:not(.w):not(.nw), strong, summary, div");
      if (box && box.clientWidth && span.offsetWidth > box.clientWidth) span.classList.add("is-loose");
    });
  }
  let fitTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitPhrases, 150);
  });

  /* ---------- active section in nav ---------- */
  const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
  }

  setLanguage(store(STORAGE_KEY) || "zh");
})();
