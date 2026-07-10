/**
 * theme.json 기반 CSS 변수 + 프리셋 + 방문자 테마 스위처
 */
const THEME_STORAGE_KEY = "portfolio-theme-preset";

const LEGACY_PRESET_MAP = {
  minimal: "ivory",
  glass: "ink",
  midnight: "obsidian",
  cream: "paper",
  slate: "carbon",
  forest: "sage",
  noir: "obsidian",
};

const THEME_PRESETS = {
  modern: {
    label: "Editorial",
    desc: "다크 버건디 · 클래식",
    swatch: ["#8B2942", "#0D0D0D", "#F5F0EA"],
    colors: {
      primary: "#8B2942", primaryDeep: "#5C1A2A",
      background: "#0D0D0D", surface: "#161616", surface2: "#1E1E1E",
      text: "#F5F0EA", muted: "#A39E97",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
  },
  ivory: {
    label: "Ivory",
    desc: "라이트 · 아이보리",
    swatch: ["#8B2942", "#FAF8F5", "#1A1A1A"],
    colors: {
      primary: "#8B2942", primaryDeep: "#5C1A2A",
      background: "#FAF8F5", surface: "#FFFFFF", surface2: "#F3F0EB",
      text: "#1A1A1A", muted: "#6B6560",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "light",
  },
  ink: {
    label: "Ink",
    desc: "딥 네이비 · 실버",
    swatch: ["#7A9BB8", "#0B1018", "#E8ECF0"],
    colors: {
      primary: "#7A9BB8", primaryDeep: "#152238",
      background: "#0B1018", surface: "#111A27", surface2: "#182232",
      text: "#E8ECF0", muted: "#8A95A8",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
  },
  rosewood: {
    label: "Rosewood",
    desc: "다크 · 로즈우드",
    swatch: ["#C4786E", "#141010", "#EDE6E0"],
    colors: {
      primary: "#C4786E", primaryDeep: "#3D2420",
      background: "#141010", surface: "#1C1614", surface2: "#241C1A",
      text: "#EDE6E0", muted: "#9A8E88",
    },
    fonts: { serif: "Cormorant Garamond", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
  },
  paper: {
    label: "Paper",
    desc: "라이트 · 네이비",
    swatch: ["#1E3A5F", "#F6F4EF", "#1E293B"],
    colors: {
      primary: "#1E3A5F", primaryDeep: "#0F2847",
      background: "#F6F4EF", surface: "#FFFFFF", surface2: "#EDEAE4",
      text: "#1E293B", muted: "#64748B",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "light",
  },
  obsidian: {
    label: "Obsidian",
    desc: "블랙 · 골드",
    swatch: ["#C4A962", "#080808", "#E8E4DC"],
    colors: {
      primary: "#C4A962", primaryDeep: "#1A1608",
      background: "#080808", surface: "#101010", surface2: "#181818",
      text: "#E8E4DC", muted: "#8A8780",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
  },
  sage: {
    label: "Sage",
    desc: "다크 · 세이지",
    swatch: ["#7EA68C", "#0E1210", "#E8EDE8"],
    colors: {
      primary: "#7EA68C", primaryDeep: "#1F3328",
      background: "#0E1210", surface: "#151A17", surface2: "#1C2420",
      text: "#E8EDE8", muted: "#8A9A90",
    },
    fonts: { serif: "Cormorant Garamond", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
  },
  dusk: {
    label: "Dusk",
    desc: "다크 · 퍼플",
    swatch: ["#9B8EC4", "#100D18", "#EAE6F0"],
    colors: {
      primary: "#9B8EC4", primaryDeep: "#2A1F42",
      background: "#100D18", surface: "#171420", surface2: "#1F1A2C",
      text: "#EAE6F0", muted: "#9A92A8",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
  },
  sand: {
    label: "Sand",
    desc: "라이트 · 샌드",
    swatch: ["#B8956B", "#F7F3EC", "#2C2824"],
    colors: {
      primary: "#B8956B", primaryDeep: "#5C4A32",
      background: "#F7F3EC", surface: "#FFFFFF", surface2: "#EFEBE3",
      text: "#2C2824", muted: "#7A7268",
    },
    fonts: { serif: "Cormorant Garamond", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "light",
  },
  carbon: {
    label: "Carbon",
    desc: "다크 · 시안",
    swatch: ["#5ECEC6", "#0A0C0D", "#E2E8EA"],
    colors: {
      primary: "#5ECEC6", primaryDeep: "#143836",
      background: "#0A0C0D", surface: "#121517", surface2: "#1A1E20",
      text: "#E2E8EA", muted: "#8A9398",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
  },
  neon: {
    label: "Neon",
    desc: "네온 · 사이버펑크",
    swatch: ["#FF2D95", "#0A0014", "#E0F7FF"],
    colors: {
      primary: "#FF2D95", primaryDeep: "#3D0A5C",
      background: "#0A0014", surface: "#140020", surface2: "#1E0030",
      text: "#F0EEFF", muted: "#A890C8",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
    flashy: true,
  },
  aurora: {
    label: "Aurora",
    desc: "오로라 · 그린-핑크",
    swatch: ["#00F5A0", "#0C1020", "#FFB8E8"],
    colors: {
      primary: "#00F5A0", primaryDeep: "#1A3D5C",
      background: "#0C1020", surface: "#121828", surface2: "#1A2038",
      text: "#E8FFF5", muted: "#88A8B8",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
    flashy: true,
  },
  sunset: {
    label: "Sunset",
    desc: "선셋 · 오렌지-마젠타",
    swatch: ["#FF6B35", "#1A0A14", "#FFD4A8"],
    colors: {
      primary: "#FF6B35", primaryDeep: "#5C1838",
      background: "#1A0A14", surface: "#241018", surface2: "#2E1820",
      text: "#FFF0E8", muted: "#B89890",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
    flashy: true,
  },
  electric: {
    label: "Electric",
    desc: "일렉트릭 · 블루-옐로",
    swatch: ["#FFE600", "#1A0A3C", "#4D9FFF"],
    colors: {
      primary: "#FFE600", primaryDeep: "#2A1A6C",
      background: "#1A0A3C", surface: "#221048", surface2: "#2C1860",
      text: "#F0F0FF", muted: "#A8A0C8",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
    flashy: true,
  },
  prism: {
    label: "Prism",
    desc: "프리즘 · 레인보우",
    swatch: ["#B24BF3", "#101018", "#FF6EC7"],
    colors: {
      primary: "#B24BF3", primaryDeep: "#4A2080",
      background: "#101018", surface: "#181820", surface2: "#202028",
      text: "#F5F0FF", muted: "#9898B0",
    },
    fonts: { serif: "Playfair Display", sans: "Noto Sans KR", signature: "Cormorant Garamond" },
    mode: "dark",
    flashy: true,
  },
};

const PRESET_NAMES = Object.keys(THEME_PRESETS);

function normalizePresetName(name) {
  if (!name) return "modern";
  return LEGACY_PRESET_MAP[name] || (THEME_PRESETS[name] ? name : "modern");
}

function hexToRgb(hex) {
  if (!hex || !hex.startsWith("#")) return { r: 13, g: 13, b: 13 };
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function applyThemeSurfaces(colors, mode) {
  const root = document.documentElement;
  const isLight = mode === "light";
  const bg = colors?.background || "#0D0D0D";
  const deep = colors?.primaryDeep || "#5C1A2A";
  const deepRgb = hexToRgb(deep.startsWith("#") ? deep : "#5C1A2A");

  root.style.setProperty("--line", isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.1)");
  root.style.setProperty("--line-strong", isLight ? "rgba(0, 0, 0, 0.14)" : "rgba(255, 255, 255, 0.18)");
  root.style.setProperty("--muted-dim", isLight ? "#8A8580" : "#6B6660");

  if (isLight) {
    root.style.setProperty("--header-bg", "rgba(255, 255, 255, 0.9)");
    root.style.setProperty("--overlay-bg", "rgba(250, 248, 245, 0.88)");
    root.style.setProperty("--nav-mobile-bg", "rgba(255, 255, 255, 0.98)");
  } else {
    const { r, g, b } = hexToRgb(bg.startsWith("#") ? bg : "#0D0D0D");
    root.style.setProperty("--header-bg", `rgba(${r}, ${g}, ${b}, 0.92)`);
    root.style.setProperty("--overlay-bg", `rgba(${r}, ${g}, ${b}, 0.86)`);
    root.style.setProperty("--nav-mobile-bg", `rgba(${r}, ${g}, ${b}, 0.98)`);
  }

  root.style.setProperty(
    "--panel-overlay",
    `linear-gradient(rgba(${deepRgb.r}, ${deepRgb.g}, ${deepRgb.b}, 0.82), rgba(${deepRgb.r}, ${deepRgb.g}, ${deepRgb.b}, 0.9))`
  );
}

function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  const { colors, fonts, animations } = theme;
  const preset = normalizePresetName(theme.preset);

  if (colors) {
    const map = {
      primary: "--accent", primaryDeep: "--accent-deep", background: "--black",
      surface: "--surface", surface2: "--surface-2", text: "--white", muted: "--muted",
    };
    Object.entries(colors).forEach(([key, val]) => {
      if (map[key]) root.style.setProperty(map[key], val);
    });
  }
  if (fonts) {
    if (fonts.serif) root.style.setProperty("--serif", `"${fonts.serif}", serif`);
    if (fonts.sans) root.style.setProperty("--sans", `"${fonts.sans}", sans-serif`);
    if (fonts.signature) root.style.setProperty("--signature", `"${fonts.signature}", serif`);
  }

  const mode = resolveThemeMode(theme.mode || THEME_PRESETS[preset]?.mode);
  applyThemeSurfaces(colors || THEME_PRESETS[preset]?.colors, mode);

  PRESET_NAMES.forEach((name) => document.body.classList.remove(`theme-${name}`));
  document.body.classList.add(`theme-${preset}`);
  document.body.classList.toggle("theme-light", mode === "light");
  document.body.classList.toggle("no-animations", animations === false);
  document.body.classList.toggle("theme-glass", false);
  document.body.classList.toggle("theme-flashy", !!THEME_PRESETS[preset]?.flashy);
  document.body.dataset.themePreset = preset;
  document.body.dataset.themeMode = mode;

  ThemeSwitcher?.syncUI?.();
}

function resolveThemeMode(mode) {
  if (mode === "auto") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode || "dark";
}

function applyPreset(presetName) {
  const preset = THEME_PRESETS[normalizePresetName(presetName)];
  if (!preset) return null;
  const { label, desc, swatch, ...rest } = preset;
  return {
    ...rest,
    preset: normalizePresetName(presetName),
    mode: rest.mode || "dark",
    animations: true,
    glassmorphism: false,
  };
}

function getSavedPreset() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (!saved) return null;
    const normalized = normalizePresetName(saved);
    if (normalized !== saved) savePreset(normalized);
    return THEME_PRESETS[normalized] ? normalized : null;
  } catch {
    return null;
  }
}

function savePreset(presetName) {
  try {
    const key = normalizePresetName(presetName);
    if (key) localStorage.setItem(THEME_STORAGE_KEY, key);
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch { /* ignore */ }
}

function mergeThemeWithVisitorChoice(baseTheme) {
  const saved = getSavedPreset();
  if (!saved) return { ...baseTheme, preset: normalizePresetName(baseTheme?.preset) };
  const preset = applyPreset(saved);
  return preset
    ? { ...baseTheme, ...preset, colors: { ...baseTheme?.colors, ...preset.colors }, fonts: { ...baseTheme?.fonts, ...preset.fonts } }
    : baseTheme;
}

const ThemeSwitcher = (() => {
  let bound = false;

  function render(container) {
    if (!container || container.querySelector(".theme-switcher")) return;
    const current = getSavedPreset() || normalizePresetName(document.body.dataset.themePreset) || "modern";
    const cards = PRESET_NAMES.map((key) => {
      const p = THEME_PRESETS[key];
      const active = key === current ? " is-active" : "";
      const [accent, bg, text] = p.swatch || ["#888", "#111", "#eee"];
      return `<button type="button" class="theme-switcher__card${active}" data-theme-preset="${key}" aria-pressed="${key === current}"
        style="--card-accent:${accent};--card-bg:${bg};--card-text:${text}">
        <span class="theme-switcher__preview" aria-hidden="true"></span>
        <span class="theme-switcher__label">${p.label}</span>
        <span class="theme-switcher__desc">${p.desc}</span>
      </button>`;
    }).join("");

    container.insertAdjacentHTML("afterbegin", `
      <div class="theme-switcher">
        <button type="button" class="theme-switcher__toggle" id="themeSwitcherToggle" aria-label="테마 변경" aria-expanded="false" title="테마 변경">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
        </button>
        <div class="theme-switcher__panel" id="themeSwitcherPanel" aria-hidden="true">
          <p class="theme-switcher__title">테마 선택</p>
          <div class="theme-switcher__grid">${cards}</div>
        </div>
      </div>`);
    bind(container);
  }

  function bind() {
    if (bound) return;
    bound = true;

    document.addEventListener("click", (e) => {
      const toggle = e.target.closest("#themeSwitcherToggle");
      const card = e.target.closest("[data-theme-preset]");
      const panel = document.getElementById("themeSwitcherPanel");

      if (toggle) {
        e.stopPropagation();
        CMSNav?.closeMenu?.();
        const open = !panel?.classList.contains("is-open");
        panel?.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        panel?.setAttribute("aria-hidden", String(!open));
        return;
      }

      if (card) {
        e.stopPropagation();
        selectPreset(card.dataset.themePreset);
        panel?.classList.remove("is-open");
        document.getElementById("themeSwitcherToggle")?.setAttribute("aria-expanded", "false");
        panel?.setAttribute("aria-hidden", "true");
        return;
      }

      if (!e.target.closest(".theme-switcher")) {
        panel?.classList.remove("is-open");
        document.getElementById("themeSwitcherToggle")?.setAttribute("aria-expanded", "false");
        panel?.setAttribute("aria-hidden", "true");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.getElementById("themeSwitcherPanel")?.classList.remove("is-open");
        document.getElementById("themeSwitcherToggle")?.setAttribute("aria-expanded", "false");
      }
    });
  }

  function selectPreset(presetName) {
    const key = normalizePresetName(presetName);
    if (!THEME_PRESETS[key]) return;
    savePreset(key);
    const preset = applyPreset(key);
    const base = window.PortfolioStore?.get?.()?.theme || {};
    applyTheme({ ...base, ...preset, colors: { ...base.colors, ...preset.colors }, fonts: { ...base.fonts, ...preset.fonts } });
  }

  function syncUI() {
    const current = getSavedPreset() || normalizePresetName(document.body.dataset.themePreset) || "modern";
    document.querySelectorAll("[data-theme-preset]").forEach((btn) => {
      const active = btn.dataset.themePreset === current;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  function initFromStore() {
    const base = window.PortfolioStore?.get?.()?.theme;
    if (base) applyTheme(mergeThemeWithVisitorChoice(base));
  }

  return { render, syncUI, selectPreset, initFromStore };
})();

window.applyTheme = applyTheme;
window.applyPreset = applyPreset;
window.THEME_PRESETS = THEME_PRESETS;
window.ThemeSwitcher = ThemeSwitcher;
window.mergeThemeWithVisitorChoice = mergeThemeWithVisitorChoice;
window.normalizePresetName = normalizePresetName;

document.addEventListener("portfolio:ready", () => ThemeSwitcher.initFromStore());
