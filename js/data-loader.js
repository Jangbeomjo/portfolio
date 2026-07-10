/**
 * JSON 데이터 로더 — http(s) fetch + file:// 번들 fallback
 */
const DataLoader = (() => {
  const cache = new Map();
  const BASE = document.querySelector("script[data-cms-base]")?.dataset.cmsBase
    || (location.pathname.includes("/pages/") ? "../" : "./");

  function isFileProtocol() {
    return location.protocol === "file:";
  }

  function getBundledRaw() {
    const raw = window.__PORTFOLIO_RAW__;
    if (!raw || typeof raw !== "object") return null;
    return normalizeRaw(raw);
  }

  function normalizeRaw(raw) {
    const skills = raw.skills || { bars: [], tags: [], stackLines: [], meta: {} };
    if (!skills.stackLines) skills.stackLines = [];
    return {
      profile: raw.profile,
      projects: raw.projects,
      skills,
      education: raw.education,
      experience: raw.experience,
      certificates: raw.certificates || { items: [], meta: {} },
      training: raw.training || { items: [], meta: {} },
      awards: raw.awards || { items: [], meta: {} },
      seo: raw.seo || {},
      theme: raw.theme || {},
      resumes: raw.resumes || { items: [], meta: {} },
      documents: raw.documents || { items: [], meta: {} },
      images: raw.images || { items: [], meta: {} },
    };
  }

  async function fetchJson(path) {
    const full = path.startsWith("data/") ? `${BASE}${path}` : path;
    if (cache.has(full)) return cache.get(full);

    if (isFileProtocol()) {
      const key = path.replace(/^data\//, "").replace(/\.json$/, "");
      const bundled = getBundledRaw();
      if (bundled && key in bundled) return bundled[key];
      return null;
    }

    try {
      const res = await fetch(`${full}?t=${Date.now()}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`데이터 로드 실패: ${path}`);
      const data = await res.json();
      cache.set(full, data);
      return data;
    } catch (err) {
      const key = path.replace(/^data\//, "").replace(/\.json$/, "");
      const bundled = getBundledRaw();
      if (bundled && bundled[key] != null) return bundled[key];
      throw err;
    }
  }

  async function loadAllRaw() {
    if (isFileProtocol()) {
      const bundled = getBundledRaw();
      if (bundled) return bundled;
    }

    const keys = [
      "profile", "projects", "skills", "education", "experience",
      "certificates", "training", "awards", "seo", "theme",
      "resumes", "documents", "images",
    ];
    try {
      const results = await Promise.all(keys.map((k) => fetchJson(`data/${k}.json`)));
      const [
        profile, projects, skills, education, experience,
        certificates, training, awards, seo, theme,
        resumes, documents, images,
      ] = results;
      return normalizeRaw({
        profile, projects, skills, education, experience,
        certificates, training, awards, seo, theme,
        resumes, documents, images,
      });
    } catch (err) {
      const bundled = getBundledRaw();
      if (bundled) return bundled;
      throw err;
    }
  }

  async function loadPortfolio() {
    const raw = await loadAllRaw();
    return { raw, profile: raw.profile, seo: raw.seo, theme: raw.theme };
  }

  /** Publish 시 file:// 번들 동기화용 */
  function buildBundleObject(data) {
    return {
      profile: { ...data.profile, about: data.about },
      projects: data.projects,
      skills: data.skills,
      education: data.education,
      experience: data.experience,
      certificates: data.certificates,
      training: data.training,
      awards: data.awards,
      seo: data.seo,
      theme: data.theme,
      resumes: data.resumes,
      documents: data.documents,
      images: data.images,
    };
  }

  function buildBundleScript(data) {
    return `/** Auto-generated — file:// fallback */\nwindow.__PORTFOLIO_RAW__ = ${JSON.stringify(buildBundleObject(data), null, 2)};\n`;
  }

  function hasBundledData() {
    return !!(window.__PORTFOLIO_RAW__ && typeof window.__PORTFOLIO_RAW__ === "object");
  }

  function clearCache() { cache.clear(); }

  return {
    fetchJson, loadAllRaw, loadPortfolio, clearCache, buildBundleScript, buildBundleObject, BASE, isFileProtocol, hasBundledData,
  };
})();

window.DataLoader = DataLoader;
