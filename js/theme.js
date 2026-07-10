/**
 * theme.json 기반 CSS 변수 + 프리셋 + 방문자 테마 스위처
 */
const THEME_STORAGE_KEY = "portfolio-theme-preset";

const LEGACY_PRESET_MAP = {
  minimal: "ivory",
  glass: "ink",
  midnight: "moonlit",
  cream: "pearl",
  paper: "pearl",
  slate: "moonlit",
  forest: "sage",
  noir: "mulberry",
  rosewood: "mulberry",
  obsidian: "twilight",
  dusk: "twilight",
  sand: "pearl",
  carbon: "moonlit",
  neon: "mulberry",
  aurora: "blush",
  sunset: "peach",
  electric: "ocean",
  prism: "lilac",
};

const EDITORIAL_FONTS = {
  serif: "Playfair Display",
  sans: "Noto Sans KR",
  signature: "Cormorant Garamond",
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
      tintSkills: "#161616", tintActivities: "#141414",
    },
    fonts: EDITORIAL_FONTS,
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
      tintSkills: "#F0EBE3", tintActivities: "#EDE8E0",
    },
    fonts: EDITORIAL_FONTS,
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
      tintSkills: "#141C28", tintActivities: "#101820",
    },
    fonts: EDITORIAL_FONTS,
    mode: "dark",
  },
  blush: {
    label: "Blush",
    desc: "로즈 · 크림",
    swatch: ["#C2788E", "#FAF7F4", "#3D2A30"],
    colors: {
      primary: "#C2788E", primaryDeep: "#9E5A72",
      background: "#FAF7F4", surface: "#FFFFFF", surface2: "#F3E8E4",
      text: "#3D2A30", muted: "#8E757C",
      tintSkills: "#EBE3EF", tintActivities: "#E8EFE8",
    },
    fonts: EDITORIAL_FONTS,
    mode: "light",
  },
  lilac: {
    label: "Lilac",
    desc: "라일락 · 퍼플",
    swatch: ["#9B7EB8", "#F8F5FA", "#2E2438"],
    colors: {
      primary: "#9B7EB8", primaryDeep: "#6B5088",
      background: "#F8F5FA", surface: "#FFFFFF", surface2: "#EDE6F2",
      text: "#2E2438", muted: "#7A6E88",
      tintSkills: "#E3E8F0", tintActivities: "#E8F0E8",
    },
    fonts: EDITORIAL_FONTS,
    mode: "light",
  },
  sage: {
    label: "Sage",
    desc: "세이지 · 그린",
    swatch: ["#6E9B82", "#F5F8F5", "#243028"],
    colors: {
      primary: "#6E9B82", primaryDeep: "#3D6B52",
      background: "#F5F8F5", surface: "#FFFFFF", surface2: "#E5EFE8",
      text: "#243028", muted: "#6E7A72",
      tintSkills: "#E8EDE3", tintActivities: "#DFEAE2",
    },
    fonts: EDITORIAL_FONTS,
    mode: "light",
  },
  peach: {
    label: "Peach",
    desc: "피치 · 코랄",
    swatch: ["#D4876A", "#FBF6F2", "#3A2820"],
    colors: {
      primary: "#D4876A", primaryDeep: "#A85A42",
      background: "#FBF6F2", surface: "#FFFFFF", surface2: "#F5E8DF",
      text: "#3A2820", muted: "#917A6E",
      tintSkills: "#F0E8E3", tintActivities: "#EDE5DC",
    },
    fonts: EDITORIAL_FONTS,
    mode: "light",
  },
  ocean: {
    label: "Ocean",
    desc: "오션 · 블루",
    swatch: ["#5A94B8", "#F4F8FA", "#1E2E38"],
    colors: {
      primary: "#5A94B8", primaryDeep: "#3A6888",
      background: "#F4F8FA", surface: "#FFFFFF", surface2: "#E3EEF2",
      text: "#1E2E38", muted: "#6E828E",
      tintSkills: "#E5EAF0", tintActivities: "#E0EBE8",
    },
    fonts: EDITORIAL_FONTS,
    mode: "light",
  },
  pearl: {
    label: "Pearl",
    desc: "펄 · 골드",
    swatch: ["#B8956B", "#FAF8F5", "#2C2824"],
    colors: {
      primary: "#B8956B", primaryDeep: "#8A6848",
      background: "#FAF8F5", surface: "#FFFFFF", surface2: "#F0EBE3",
      text: "#2C2824", muted: "#7A7268",
      tintSkills: "#EBE8E0", tintActivities: "#E8E5DD",
    },
    fonts: EDITORIAL_FONTS,
    mode: "light",
  },
  twilight: {
    label: "Twilight",
    desc: "트와일라 · 플럼",
    swatch: ["#A898D8", "#16101E", "#EDE8F5"],
    colors: {
      primary: "#A898D8", primaryDeep: "#6B58A8",
      background: "#16101E", surface: "#221C2C", surface2: "#2A2238",
      text: "#EDE8F5", muted: "#A098B0",
      tintSkills: "#1E1828", tintActivities: "#1A2028",
    },
    fonts: EDITORIAL_FONTS,
    mode: "dark",
  },
  mulberry: {
    label: "Mulberry",
    desc: "멀베리 · 와인",
    swatch: ["#C2788E", "#1A1014", "#F5E8EC"],
    colors: {
      primary: "#C2788E", primaryDeep: "#8E4558",
      background: "#1A1014", surface: "#261820", surface2: "#322028",
      text: "#F5E8EC", muted: "#B098A0",
      tintSkills: "#281820", tintActivities: "#182018",
    },
    fonts: EDITORIAL_FONTS,
    mode: "dark",
  },
  moonlit: {
    label: "Moonlit",
    desc: "문릿 · 네이비",
    swatch: ["#6EB8C8", "#0E1418", "#E4EEF2"],
    colors: {
      primary: "#6EB8C8", primaryDeep: "#3A7888",
      background: "#0E1418", surface: "#161E24", surface2: "#1C2830",
      text: "#E4EEF2", muted: "#8898A0",
      tintSkills: "#141C24", tintActivities: "#142018",
    },
    fonts: EDITORIAL_FONTS,
    mode: "dark",
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

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex?.startsWith("#") ? hex : "#000000");
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function isLightColor(hex) {
  return relativeLuminance(hex) > 0.58;
}

function contrastRatio(fgHex, bgHex) {
  const L1 = relativeLuminance(fgHex?.startsWith("#") ? fgHex : "#888888");
  const L2 = relativeLuminance(bgHex?.startsWith("#") ? bgHex : "#0D0D0D");
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA?.startsWith("#") ? hexA : "#888888");
  const b = hexToRgb(hexB?.startsWith("#") ? hexB : "#141414");
  const mix = (x, y) => Math.round(x + (y - x) * t);
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(a.r, b.r))}${toHex(mix(a.g, b.g))}${toHex(mix(a.b, b.b))}`;
}

function ensureContrast(fgHex, bgHex, minRatio = 3.2) {
  const fg = fgHex?.startsWith("#") ? fgHex : "#888888";
  const bg = bgHex?.startsWith("#") ? bgHex : "#0D0D0D";
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  const target = isLightColor(bg) ? "#141414" : "#F5F0EA";
  for (let t = 0.05; t <= 1; t += 0.05) {
    const candidate = mixHex(fg, target, t);
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
  }
  return target;
}

function pickTextOn(bgHex, light = "#FFFFFF", dark = "#141414") {
  return isLightColor(bgHex) ? dark : light;
}

function rgbaOn(bgHex, alpha, light = [255, 255, 255], dark = [20, 20, 20]) {
  const rgb = isLightColor(bgHex) ? dark : light;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function applyThemeSurfaces(colors, mode) {
  const root = document.documentElement;
  const isLight = mode === "light";
  const bg = colors?.background || "#0D0D0D";
  const surface = colors?.surface || "#161616";
  const accent = colors?.primary || "#8B2942";
  const text = colors?.text || (isLight ? "#1A1A1A" : "#F5F0EA");
  const deep = colors?.primaryDeep || "#5C1A2A";
  const deepHex = deep.startsWith("#") ? deep : "#5C1A2A";
  const deepRgb = hexToRgb(deepHex);
  const textHex = text.startsWith("#") ? text : (isLight ? "#1A1A1A" : "#F5F0EA");
  const mutedHex = colors?.muted || (isLight ? "#6B6560" : "#A39E97");
  const tint = isLight ? "0, 0, 0" : "255, 255, 255";
  const onAccent = pickTextOn(deepHex);
  const bgHex = bg.startsWith("#") ? bg : "#0D0D0D";
  const surfaceHex = surface.startsWith("#") ? surface : "#161616";

  root.style.setProperty("--accent-readable", ensureContrast(accent, bgHex));
  root.style.setProperty("--accent-readable-surface", ensureContrast(accent, surfaceHex));
  root.style.setProperty("--muted-readable", ensureContrast(mutedHex, bgHex, 3));
  root.style.setProperty("--muted-readable-surface", ensureContrast(mutedHex, surfaceHex, 3));

  root.style.setProperty("--line", isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.1)");
  root.style.setProperty("--line-strong", isLight ? "rgba(0, 0, 0, 0.14)" : "rgba(255, 255, 255, 0.18)");
  root.style.setProperty("--muted-dim", isLight ? "#8A8580" : "#6B6660");

  root.style.setProperty("--text-primary", textHex);
  root.style.setProperty("--text-soft", colors?.muted || (isLight ? "#6B6560" : "#A39E97"));
  root.style.setProperty("--text-on-accent", onAccent);
  root.style.setProperty("--text-on-accent-muted", rgbaOn(deepHex, 0.72));
  root.style.setProperty("--text-on-accent-faint", rgbaOn(deepHex, 0.48));
  root.style.setProperty("--text-on-accent-soft", rgbaOn(deepHex, 0.82));
  root.style.setProperty("--text-on-accent-dim", rgbaOn(deepHex, 0.58));
  root.style.setProperty("--line-on-accent", rgbaOn(deepHex, 0.14));
  root.style.setProperty("--surface-tint-03", `rgba(${tint}, 0.03)`);
  root.style.setProperty("--surface-tint-04", `rgba(${tint}, 0.04)`);
  root.style.setProperty("--surface-tint-06", `rgba(${tint}, 0.06)`);
  root.style.setProperty("--surface-tint-08", `rgba(${tint}, 0.08)`);
  root.style.setProperty("--surface-tint-10", `rgba(${tint}, 0.10)`);
  root.style.setProperty("--surface-tint-55", `rgba(${tint}, 0.55)`);
  root.style.setProperty("--body-soft", `color-mix(in srgb, ${textHex} 78%, transparent)`);
  root.style.setProperty("--body-muted", `color-mix(in srgb, ${textHex} 62%, transparent)`);
  root.style.setProperty("--body-faint", `color-mix(in srgb, ${textHex} 48%, transparent)`);

  if (isLight) {
    const bgRgb = hexToRgb(bgHex);
    const surfRgb = hexToRgb(surfaceHex);
    root.style.setProperty("--header-bg", `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.9)`);
    root.style.setProperty("--overlay-bg", `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.88)`);
    root.style.setProperty("--nav-mobile-bg", `rgba(${surfRgb.r}, ${surfRgb.g}, ${surfRgb.b}, 0.98)`);
    const accentRgb = hexToRgb(accent.startsWith("#") ? accent : "#8B2942");
    root.style.setProperty("--line", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.1)`);
    root.style.setProperty("--line-strong", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.16)`);
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

  const editorBg = "#0C0C0C";
  const editAccent = ensureContrast(accent, bgHex, 3.5);
  root.style.setProperty("--editor-ui-bg", editorBg);
  root.style.setProperty("--editor-ui-text", "#F5F0EA");
  root.style.setProperty("--editor-ui-muted", ensureContrast("#A39E97", editorBg, 3));
  root.style.setProperty("--editor-ui-accent", ensureContrast(accent, editorBg, 4.5));
  root.style.setProperty("--editor-ui-border", "rgba(255, 255, 255, 0.12)");
  root.style.setProperty("--editor-ui-border-faint", "rgba(255, 255, 255, 0.08)");
  root.style.setProperty("--editor-ui-surface", "rgba(0, 0, 0, 0.4)");
  root.style.setProperty("--editor-ui-primary-bg", accent.startsWith("#") ? accent : "#8B2942");
  root.style.setProperty("--editor-ui-primary-text", pickTextOn(accent.startsWith("#") ? accent : "#8B2942"));
  root.style.setProperty("--editor-ui-primary-deep", deepHex);
  root.style.setProperty("--edit-accent", editAccent);
  root.style.setProperty("--edit-accent-dim", `color-mix(in srgb, ${editAccent} 55%, transparent)`);
  root.style.setProperty("--edit-accent-soft", `color-mix(in srgb, ${editAccent} 35%, transparent)`);
  root.style.setProperty("--edit-accent-bg", `color-mix(in srgb, ${editAccent} 8%, transparent)`);
  root.style.setProperty("--edit-accent-bg-hover", `color-mix(in srgb, ${editAccent} 14%, transparent)`);
  root.style.setProperty("--edit-accent-bg-strong", `color-mix(in srgb, ${editAccent} 50%, transparent)`);
}

function applyEditorialPalette(colors, mode) {
  if (document.body.classList.contains("skin-shinbi") || !colors) return;

  const root = document.documentElement;
  const isLight = mode === "light";
  const bg = colors.background || "#0D0D0D";
  const surface = colors.surface || "#161616";
  const surface2 = colors.surface2 || surface;
  const accent = colors.primary || "#8B2942";
  const deep = colors.primaryDeep || accent;
  const text = colors.text || (isLight ? "#1A1A1A" : "#F5F0EA");
  const muted = colors.muted || "#A39E97";
  const tintSkills = colors.tintSkills || (isLight ? surface2 : surface);
  const tintActivities = colors.tintActivities || (isLight ? surface2 : bg);
  const visualBg = isLight ? surface2 : "#0A0A0A";

  const onSurface = ensureContrast(text, surface, 4.5);
  const onSurfaceMuted = ensureContrast(muted, surface, 3);
  const accentOnBg = ensureContrast(accent, bg, 3.2);
  const accentOnSurface = ensureContrast(accent, surface, 3.2);
  const decoOnVisual = ensureContrast(accent, visualBg, 3);
  const accentRgb = hexToRgb(accent.startsWith("#") ? accent : "#8B2942");
  const journeyBorder = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${isLight ? 0.14 : 0.2})`;

  const tokens = {
    "--ep-page-bg": bg,
    "--ep-about-bg": isLight ? surface2 : bg,
    "--ep-skills-bg": tintSkills,
    "--ep-activities-bg": tintActivities,
    "--ep-contact-bg": isLight ? surface2 : bg,
    "--ep-education-visual-bg": visualBg,
    "--ep-hanja-strong": `color-mix(in srgb, ${accent} ${isLight ? 30 : 24}%, transparent)`,
    "--ep-hanja-soft": `color-mix(in srgb, ${accent} ${isLight ? 16 : 12}%, transparent)`,
    "--ep-hanja-mobile": `color-mix(in srgb, ${accent} ${isLight ? 22 : 18}%, transparent)`,
    "--ep-education-deco": decoOnVisual,
    "--ep-journey-bg": isLight
      ? `color-mix(in srgb, ${surface} 90%, ${surface2})`
      : `color-mix(in srgb, ${surface} 88%, ${bg})`,
    "--ep-journey-border": journeyBorder,
    "--ep-journey-year": accentOnSurface,
    "--ep-journey-label": onSurfaceMuted,
    "--ep-box-text": onSurface,
    "--ep-box-text-muted": onSurfaceMuted,
    "--ep-chip-bg": isLight
      ? `color-mix(in srgb, ${surface} 86%, ${bg})`
      : `color-mix(in srgb, ${surface} 80%, ${bg})`,
    "--ep-chip-border": `color-mix(in srgb, ${accentOnBg} 28%, var(--line))`,
    "--ep-chip-text": onSurfaceMuted,
    "--ep-education-panel": deep,
  };

  Object.entries(tokens).forEach(([key, val]) => root.style.setProperty(key, val));
  document.body.style.background = bg;
  document.body.style.color = ensureContrast(text, bg, 4.5);
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
  document.body.classList.toggle("theme-glass", !!theme.glassmorphism);
  document.body.classList.toggle("theme-flashy", !!THEME_PRESETS[preset]?.flashy);
  document.body.dataset.themePreset = preset;
  document.body.dataset.themeMode = mode;

  applyThemeLayout(theme);
  applyEditorialPalette(colors || THEME_PRESETS[preset]?.colors, mode);
  ThemeSwitcher?.syncUI?.();
}

const THEME_LAYOUT_DEFAULTS = {
  containerMax: 1100,
  sectionPad: 0,
  portraitW: 280,
  portraitSm: 220,
  baseFontSize: 16,
  titleScale: 1,
};

function applyThemeLayout(theme) {
  const root = document.documentElement;
  const layout = { ...THEME_LAYOUT_DEFAULTS, ...(theme?.layout || {}) };
  const maxW = Number(layout.containerMax) || THEME_LAYOUT_DEFAULTS.containerMax;

  root.style.setProperty(
    "--container",
    `min(${maxW}px, calc(100% - 2 * var(--page-gutter, 1.5rem)))`
  );

  const sectionPad = Number(layout.sectionPad);
  if (sectionPad > 0) {
    root.style.setProperty("--section-pad", `${sectionPad}rem`);
  } else {
    root.style.removeProperty("--section-pad");
  }

  const portraitW = Number(layout.portraitW) || THEME_LAYOUT_DEFAULTS.portraitW;
  const portraitSm = Number(layout.portraitSm) || THEME_LAYOUT_DEFAULTS.portraitSm;
  root.style.setProperty("--portrait-w", `min(${portraitW}px, 72vw)`);
  root.style.setProperty("--portrait-w-sm", `min(${portraitSm}px, 55vw)`);

  const baseFontSize = Number(layout.baseFontSize) || THEME_LAYOUT_DEFAULTS.baseFontSize;
  root.style.fontSize = baseFontSize === THEME_LAYOUT_DEFAULTS.baseFontSize
    ? ""
    : `${baseFontSize}px`;

  const titleScale = Number(layout.titleScale) || THEME_LAYOUT_DEFAULTS.titleScale;
  root.style.setProperty("--title-scale", String(titleScale));
}

function resolveThemeMode(mode) {
  if (mode === "auto") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode || "dark";
}

function applyPreset(presetName, baseTheme) {
  const preset = THEME_PRESETS[normalizePresetName(presetName)];
  if (!preset) return null;
  const { label, desc, swatch, ...rest } = preset;
  return {
    ...rest,
    preset: normalizePresetName(presetName),
    mode: rest.mode || "dark",
    animations: baseTheme?.animations ?? true,
    glassmorphism: baseTheme?.glassmorphism ?? false,
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
  const preset = applyPreset(saved, baseTheme);
  return preset
    ? { ...baseTheme, ...preset, colors: { ...baseTheme?.colors, ...preset.colors }, fonts: { ...baseTheme?.fonts, ...preset.fonts } }
    : baseTheme;
}

const ThemeSwitcher = (() => {
  let bound = false;

  function getPanel() {
    return document.getElementById("themeSwitcherPanel");
  }

  function getToggle() {
    return document.getElementById("themeSwitcherToggle");
  }

  function getBackdrop() {
    return document.getElementById("themeSwitcherBackdrop");
  }

  function ensureBackdrop() {
    if (getBackdrop()) return;
    document.body.insertAdjacentHTML(
      "beforeend",
      '<button type="button" class="theme-switcher__backdrop" id="themeSwitcherBackdrop" aria-hidden="true" tabindex="-1"></button>'
    );
  }

  function mountPanel() {
    const panel = getPanel();
    ensureBackdrop();
    if (panel && panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }
  }

  function positionThemePanel() {
    const panel = getPanel();
    const toggle = getToggle();
    if (!panel || !panel.classList.contains("is-open") || !toggle) return;

    if (window.matchMedia("(max-width: 960px)").matches) {
      panel.style.removeProperty("top");
      panel.style.removeProperty("right");
      panel.style.removeProperty("left");
      panel.style.removeProperty("bottom");
      return;
    }

    const rect = toggle.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
    panel.style.left = "auto";
    panel.style.bottom = "auto";
  }

  function setPanelOpen(open) {
    const panel = getPanel();
    const toggle = getToggle();
    const backdrop = getBackdrop();
    if (!panel || !toggle) return;

    panel.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("theme-panel-open", open);
    backdrop?.classList.toggle("is-open", open);
    backdrop?.setAttribute("aria-hidden", String(!open));

    if (open) {
      mountPanel();
      positionThemePanel();
    }
  }

  function closePanel() {
    setPanelOpen(false);
  }

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
    mountPanel();
    bind(container);
  }

  function bind() {
    if (bound) return;
    bound = true;

    document.addEventListener("click", (e) => {
      const toggle = e.target.closest("#themeSwitcherToggle");
      const card = e.target.closest("[data-theme-preset]");
      const backdrop = e.target.closest("#themeSwitcherBackdrop");

      if (toggle) {
        e.stopPropagation();
        CMSNav?.closeMenu?.();
        const open = !getPanel()?.classList.contains("is-open");
        setPanelOpen(open);
        return;
      }

      if (backdrop) {
        e.stopPropagation();
        closePanel();
        return;
      }

      if (card) {
        e.stopPropagation();
        selectPreset(card.dataset.themePreset);
        closePanel();
        return;
      }

      if (!e.target.closest(".theme-switcher") && !e.target.closest("#themeSwitcherPanel")) {
        closePanel();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePanel();
    });

    window.addEventListener("scroll", () => {
      if (getPanel()?.classList.contains("is-open")) positionThemePanel();
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (getPanel()?.classList.contains("is-open")) positionThemePanel();
    }, { passive: true });
  }

  function selectPreset(presetName) {
    const key = normalizePresetName(presetName);
    if (!THEME_PRESETS[key]) return;
    savePreset(key);
    const base = window.PortfolioStore?.get?.()?.theme || {};
    const preset = applyPreset(key, base);
    applyTheme({
      ...base,
      ...preset,
      colors: { ...base.colors, ...preset.colors },
      fonts: { ...base.fonts, ...preset.fonts },
      glassmorphism: base.glassmorphism ?? preset.glassmorphism,
    });
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

  return { render, syncUI, selectPreset, initFromStore, close: closePanel };
})();

window.applyTheme = applyTheme;
window.applyPreset = applyPreset;
window.THEME_PRESETS = THEME_PRESETS;
window.ThemeSwitcher = ThemeSwitcher;
window.mergeThemeWithVisitorChoice = mergeThemeWithVisitorChoice;
window.normalizePresetName = normalizePresetName;

document.addEventListener("portfolio:ready", () => ThemeSwitcher.initFromStore());
