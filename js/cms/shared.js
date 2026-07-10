/**
 * CMS 공통 유틸 — 리스트 CRUD, Event Delegation 헬퍼
 */
const CMS = (() => {
  const SKILL_CATEGORIES = ["Frontend", "Backend", "Database", "Cloud", "DevOps", "AI", "Language", "Tool"];
  const ACTIVITY_TYPES = ["intern", "bootcamp", "education", "external", "seminar", "volunteer"];
  const DOC_VISIBILITY = ["public", "private", "link", "password"];
  const PROJECT_STATUS = ["planning", "in-progress", "completed", "archived"];

  function esc(str) {
    if (!str) return "";
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function sortByOrder(items) {
    return [...(items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function getList(listKey) {
    const data = PortfolioStore.get();
    if (listKey === "stackLines") return data.skills?.stackLines;
    if (listKey === "skills") return data.skills?.bars;
    if (listKey === "aboutSections") return data.profile?.about?.sections;
    if (listKey === "heroJourney") return data.profile?.heroJourney;
    if (listKey === "introLines") return data.profile?.introLines;
    if (listKey === "resumeLines") return data.profile?.resumeLines;
    return data[listKey]?.items;
  }

  /** 리스트 항목 순서 변경 */
  function reorderItem(listKey, id, dir) {
    const list = getList(listKey);
    if (!list) return false;
    const idx = list.findIndex((i) => i.id === id);
    if (idx < 0) return false;
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return false;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    list.forEach((item, i) => { item.order = i; });
    PortfolioStore.notifyChange();
    return true;
  }

  /** 리스트 항목 삭제 */
  function deleteItem(listKey, id, label = "항목") {
    EditorUI.confirm(`이 ${label}을(를) 삭제하시겠습니까?`).then((ok) => {
      if (ok) {
        if (listKey === "heroJourney" || listKey === "introLines" || listKey === "resumeLines") {
          PortfolioStore.removeProfileLine(listKey, id);
        } else {
          PortfolioStore.removeItem(listKey, id);
        }
        rerender();
      }
    });
  }

  /** 프로필 라인 삭제 */
  function deleteProfileLine(arrayKey, id) {
    EditorUI.confirm("이 라인을 삭제하시겠습니까?").then((ok) => {
      if (ok) {
        PortfolioStore.removeProfileLine(arrayKey, id);
        rerender();
      }
    });
  }

  function rerender() {
    if (window.renderPortfolio) window.renderPortfolio();
    else if (window.renderProjectsPage) window.renderProjectsPage();
    else if (window.renderResumeDocument) window.renderResumeDocument();
    else if (window.renderResumeList) window.renderResumeList();
    else if (window.renderDocuments) window.renderDocuments();
    else if (window.renderImageLibrary) window.renderImageLibrary();
  }

  const _imagePreviewCache = new Map();
  const ASSET_CACHE_KEY = "portfolio_cms_asset_cache";
  const MAX_PERSIST_PREVIEW = 1.5 * 1024 * 1024;
  const GITHUB_DEFAULTS = { owner: "Jangbeomjo", repo: "portfolio", branch: "main" };
  window.CMS_GITHUB = { ...GITHUB_DEFAULTS, ...(window.CMS_GITHUB || {}) };

  /** GitHub 저장소 설정 (cms-config + 세션) */
  function getGithubConfig() {
    const gh = window.CMS_GITHUB || GITHUB_DEFAULTS;
    const repo = EditorAuth?.getSession?.()?.repo;
    return {
      owner: repo?.owner || gh.owner || GITHUB_DEFAULTS.owner,
      repo: repo?.repo || gh.repo || GITHUB_DEFAULTS.repo,
      branch: repo?.branch || gh.branch || GITHUB_DEFAULTS.branch,
    };
  }

  function githubRawUrl(cleanPath) {
    const gh = getGithubConfig();
    if (!cleanPath || !gh.owner || !gh.repo) return "";
    const clean = cleanPath.replace(/^\.\//, "");
    return `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${gh.branch}/${clean}`;
  }

  function readAssetCacheMap() {
    try {
      return JSON.parse(localStorage.getItem(ASSET_CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeAssetCacheEntry(cleanPath, previewUrl) {
    if (!cleanPath || !previewUrl?.startsWith("data:") || previewUrl.length > MAX_PERSIST_PREVIEW) return;
    try {
      const map = readAssetCacheMap();
      map[cleanPath] = previewUrl;
      localStorage.setItem(ASSET_CACHE_KEY, JSON.stringify(map));
    } catch { /* quota */ }
  }

  function cacheImagePreview(path, previewUrl) {
    if (!path || !previewUrl) return;
    _imagePreviewCache.set(path, previewUrl);
    const clean = path.replace(/^\.\//, "");
    if (clean !== path) _imagePreviewCache.set(clean, previewUrl);
    if (!path.startsWith("./")) _imagePreviewCache.set(`./${clean}`, previewUrl);
    try {
      if (previewUrl.startsWith("data:") && previewUrl.length <= MAX_PERSIST_PREVIEW) {
        sessionStorage.setItem(`cms-asset:${clean}`, previewUrl);
        writeAssetCacheEntry(clean, previewUrl);
      } else if (!previewUrl.startsWith("blob:")) {
        sessionStorage.setItem(`cms-asset:${clean}`, previewUrl);
      }
    } catch { /* quota */ }
  }

  function readCachedPreview(path) {
    if (!path) return "";
    const clean = path.replace(/^\.\//, "");
    const keys = [path, clean, `./${clean}`];
    for (const key of keys) {
      if (_imagePreviewCache.has(key)) return _imagePreviewCache.get(key);
    }
    for (const prefix of ["cms-asset:", "cms-img:"]) {
      try {
        const stored = sessionStorage.getItem(`${prefix}${clean}`);
        if (stored) {
          cacheImagePreview(path, stored);
          return stored;
        }
      } catch { /* ignore */ }
    }
    const cached = readAssetCacheMap()[clean];
    if (cached) {
      cacheImagePreview(path, cached);
      return cached;
    }
    return "";
  }

  /** 같은 출처 정적 asset 경로 */
  function localAssetUrl(path) {
    if (!path) return "";
    const clean = path.replace(/^\.\//, "");
    const base = location.pathname.includes("/pages/") ? ".." : ".";
    return `${base}/${clean}`;
  }

  const DEFAULT_PROFILE_IMAGE = "./assets/profile.png";

  /** CMS 업로드 asset — Draft 캐시 → GitHub raw → 로컬 */
  function resolveCmsAssetUrl(path) {
    const cached = readCachedPreview(path);
    if (cached) return cached;
    const clean = path.replace(/^\.\//, "");
    const raw = githubRawUrl(clean);
    if (raw) return raw;
    return localAssetUrl(path);
  }

  /** asset URL — 정적 파일은 로컬 우선, CMS 업로드는 GitHub raw fallback */
  function resolveAssetUrl(path) {
    if (!path) return "";
    if (/^(https?:|blob:|data:)/.test(path)) return path;
    const clean = path.replace(/^\.\//, "");

    if (clean.startsWith("assets/images/") || clean.startsWith("assets/docs/")) {
      return resolveCmsAssetUrl(path);
    }

    if (clean.startsWith("assets/")) return localAssetUrl(path);

    return localAssetUrl(path);
  }

  /** 이미지 로드 실패 시 GitHub raw → 로컬 fallback */
  function setImageSrc(img, path, fallback = DEFAULT_PROFILE_IMAGE) {
    if (!img) return;
    const fb = localAssetUrl(fallback) || fallback;
    const trimmed = (path || "").trim();
    const clean = trimmed.replace(/^\.\//, "");
    const githubRaw = clean.startsWith("assets/images/") ? githubRawUrl(clean) : null;

    img.onerror = () => {
      if (githubRaw && img.src !== githubRaw) {
        img.onerror = () => {
          img.onerror = null;
          if (img.src !== fb) img.src = fb;
        };
        img.src = githubRaw;
        return;
      }
      img.onerror = null;
      if (img.src !== fb) img.src = fb;
    };
    const url = trimmed ? resolveAssetUrl(trimmed) : fb;
    img.src = url || fb;
  }

  /** Draft 저장용 — 작은 파일은 data URL, 큰 파일은 blob URL */
  function fileToPersistentUrl(file) {
    const maxData = 3 * 1024 * 1024;
    if (file.size > maxData) return Promise.resolve(URL.createObjectURL(file));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /** Draft 저장용 — data URL 우선 (새로고침 후에도 유지) */
  async function toDraftImageUrl(file) {
    let f = file;
    for (const quality of [0.85, 0.7, 0.55]) {
      try {
        const compressed = await compressImage(file, 1280, quality);
        f = compressed;
        if (compressed.size <= 1.5 * 1024 * 1024) break;
      } catch { break; }
    }
    if (f.size > 3 * 1024 * 1024) {
      throw new Error("이미지가 너무 큽니다. 3MB 이하 파일을 사용해 주세요.");
    }
    const url = await fileToPersistentUrl(f);
    if (url.startsWith("blob:")) {
      throw new Error("이미지가 너무 커서 Draft에 저장할 수 없습니다. 더 작은 파일을 사용해 주세요.");
    }
    return url;
  }

  /** 업로드 — GitHub 시도 후 실패 시 Draft 로컬 저장 */
  async function persistUploadedFile(file) {
    const buildPreview = async () => {
      if (file.type?.startsWith("image/")) {
        try { return await toDraftImageUrl(file); } catch { /* fall through */ }
      }
      return fileToPersistentUrl(file);
    };

    if (EditorAuth?.canUseGithub?.()) {
      try {
        const path = await EditorUpload.uploadFile(file);
        try {
          const preview = await buildPreview();
          if (preview) cacheImagePreview(path, preview);
        } catch { /* preview optional */ }
        return path;
      } catch (err) {
        console.warn("[CMS] GitHub upload failed:", err);
      }
    }
    EditorUI?.showToast?.("Draft에 로컬 저장됩니다.", "info");
    const localUrl = await buildPreview();
    if (localUrl?.startsWith("blob:")) {
      throw new Error("파일이 너무 커서 Draft에 저장할 수 없습니다. GitHub 로그인 후 업로드하세요.");
    }
    return localUrl;
  }

  (function preloadGithubConfig() {
    const base = location.pathname.includes("/pages/") ? "../" : "./";
    fetch(`${base}data/cms-config.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => { if (c?.github) window.CMS_GITHUB = { ...GITHUB_DEFAULTS, ...c.github }; })
      .catch(() => {});
  })();

  /** 모든 edit-list-item에 공통 컨트롤 주입 */
  function injectGenericControls() {
    document.querySelectorAll(".edit-list-item").forEach((item) => {
      if (item.querySelector(".edit-list-item__controls")) return;
      const listKey = item.dataset.editList;
      const id = item.dataset.editId;
      if (!listKey || !id) return;
      if (listKey === "introLines" || listKey === "resumeLines") {
        injectLineControls(item, listKey, id);
        return;
      }
      if (listKey === "projects") return; // 프로젝트는 별도 컨트롤
      const ctrl = document.createElement("div");
      ctrl.className = "edit-list-item__controls edit-only";
      ctrl.innerHTML = `
        <button type="button" class="edit-ctrl-btn" data-list-action="up" data-list-key="${listKey}" data-list-id="${id}">↑</button>
        <button type="button" class="edit-ctrl-btn" data-list-action="down" data-list-key="${listKey}" data-list-id="${id}">↓</button>
        <button type="button" class="edit-ctrl-btn" data-list-action="delete" data-list-key="${listKey}" data-list-id="${id}">×</button>`;
      item.appendChild(ctrl);
    });
  }

  function injectLineControls(item, listKey, id) {
    const ctrl = document.createElement("div");
    ctrl.className = "edit-list-item__controls edit-only";
    ctrl.innerHTML = `
      <button type="button" class="edit-ctrl-btn" data-line-action="delete" data-line-key="${listKey}" data-line-id="${id}">×</button>`;
    item.appendChild(ctrl);
  }

  /** 공통 리스트 컨트롤 클릭 (Event Delegation) */
  function handleListAction(btn) {
    if (!document.body.classList.contains("edit-mode") || !EditorAuth?.getSession?.()) return;
    const action = btn.dataset.listAction;
    const listKey = btn.dataset.listKey;
    const id = btn.dataset.listId;
    if (action === "up" || action === "down") {
      if (reorderItem(listKey, id, action)) rerenderForList(listKey);
    } else if (action === "delete") {
      deleteItem(listKey, id);
    }
  }

  function handleLineAction(btn) {
    if (!document.body.classList.contains("edit-mode") || !EditorAuth?.getSession?.()) return;
    deleteProfileLine(btn.dataset.lineKey, btn.dataset.lineId);
  }

  function rerenderForList(listKey) {
    const map = {
      education: ["education", "about"],
      experience: ["activities", "career", "about"],
      certificates: ["certificates"],
      awards: ["awards"],
      training: ["training"],
      projects: ["projects"],
      skills: ["skills"],
      stackLines: ["skills", "about"],
      introLines: ["hero", "about"],
      resumeLines: ["education"],
      heroJourney: ["hero"],
      aboutSections: ["about"],
    };
    const sections = map[listKey] || [];
    if (window.renderPortfolio) window.renderPortfolio(sections.length ? sections : undefined);
    else rerender();
  }

  /** 이미지 압축 (canvas) */
  async function compressImage(file, maxW = 1920, quality = 0.85) {
    if (!file.type.startsWith("image/")) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxW) { height = (height * maxW) / width; width = maxW; }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
        }, "image/jpeg", quality);
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });
  }

  /** 스크롤 등장 애니메이션 — 서브페이지는 즉시 표시 */
  function initReveal() {
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => {
      if (el.dataset.revealBound) return;
      el.dataset.revealBound = "1";

      if (el.closest(".page-main")) {
        el.classList.add("is-visible");
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });
      observer.observe(el);
    });
  }

  document.addEventListener("portfolio:ready", initReveal);
  document.addEventListener("portfolio:rendered", initReveal);

  const SCROLL_KEY_PREFIX = "portfolio:scroll:";

  function scrollStorageKey(path) {
    return SCROLL_KEY_PREFIX + (path || location.pathname);
  }

  /** 목록·메인에서 상세로 이동 전 스크롤 위치 저장 */
  function saveReturnScroll(from) {
    try {
      const path = from || location.pathname;
      if (!shouldTrackScroll(path)) return;
      sessionStorage.setItem(scrollStorageKey(path), String(window.scrollY));
    } catch { /* quota */ }
  }

  function shouldTrackScroll(path) {
    const p = path || location.pathname;
    if (p.includes("/pages/")) return true;
    return !!(document.getElementById("projectGrid") || document.getElementById("hero"));
  }

  /** 뒤로가기·브랜드 링크 복귀 시 스크롤 복원 */
  function restoreReturnScroll() {
    try {
      const raw = sessionStorage.getItem(scrollStorageKey());
      if (raw == null) return;
      const top = parseInt(raw, 10);
      if (!Number.isFinite(top)) return;
      sessionStorage.removeItem(scrollStorageKey());
      const apply = () => window.scrollTo(0, top);
      requestAnimationFrame(() => {
        apply();
        requestAnimationFrame(apply);
      });
    } catch { /* ignore */ }
  }

  function bindScrollRestore() {
    window.addEventListener("pagehide", () => {
      if (shouldTrackScroll()) saveReturnScroll();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindScrollRestore);
  } else {
    bindScrollRestore();
  }

  /** portfolio:ready — InlineEditor 초기화 race 방지 */
  function signalPortfolioReady() {
    window.__portfolioReady = true;
    document.dispatchEvent(new CustomEvent("portfolio:ready"));
  }

  /** 프로필·프로젝트 등에서 쓰는 이미지 수집 (Images 페이지 표시용) */
  function collectUsedImages() {
    const data = PortfolioStore.get();
    const seen = new Set();
    const out = [];
    const add = (url, name, category, sourceKey) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      out.push({
        id: `used-${out.length}`,
        name: name || "이미지",
        url,
        alt: name,
        category: category || "other",
        featured: false,
        uploadedAt: null,
        order: out.length,
        sourceKey: sourceKey || "",
      });
    };
    const p = data.profile || {};
    add(p.avatar, "Hero 프로필", "profile", "profile.avatar");
    add(p.aboutImage, "About 프로필", "profile", "profile.aboutImage");
    add(p.educationImage, "Education 사진", "profile", "profile.educationImage");
    add(p.educationPanelBackground, "Education 패널 배경", "background", "profile.educationPanelBackground");
    add(p.backgroundImage, "Education 사진(레거시)", "profile", "profile.backgroundImage");
    add(p.activitiesBackgroundImage, "Activities 배경", "background", "profile.activitiesBackgroundImage");
    add(p.logo, "헤더 로고", "profile", "profile.logo");
    (data.projects?.items || []).forEach((proj) => {
      if (proj.thumbnail) {
        add(proj.thumbnail, `${proj.title || "프로젝트"} 썸네일`, "project", `project.${proj.id}.thumbnail`);
      }
      (proj.screenshots || proj.images || []).forEach((u, i) => {
        add(u, `${proj.title || "프로젝트"} ${i + 1}`, "project", `project.${proj.id}.screenshot.${i}`);
      });
    });
    return out;
  }

  async function uploadImageWithFallback(file, compress = true) {
    let f = file;
    if (compress) {
      try { f = await compressImage(file); } catch { f = file; }
    }

    if (EditorAuth?.canUseGithub?.()) {
      try {
        const githubPath = await EditorUpload.uploadImage(f, false);
        const preview = await fileToPersistentUrl(f);
        cacheImagePreview(githubPath, preview);
        return githubPath;
      } catch (err) {
        console.warn("[CMS] GitHub image upload failed:", err);
      }
    }

    return toDraftImageUrl(f);
  }

  function getImagePreviewUrl(path) {
    if (!path) return "";
    if (/^(https?:|blob:|data:)/.test(path)) return path;
    const cached = readCachedPreview(path);
    if (cached) return cached;
    return resolveAssetUrl(path);
  }

  function applyImageSource(sourceKey, path) {
    if (!sourceKey) return false;
    if (sourceKey.startsWith("profile.")) {
      PortfolioStore.get().profile[sourceKey.replace("profile.", "")] = path;
      PortfolioStore.notifyChange();
      if (window.renderPortfolio) window.renderPortfolio(["hero", "about", "education", "activities", "header"]);
      CMSHeader?.render?.();
      return true;
    }
    const thumbMatch = sourceKey.match(/^project\.([^.]+)\.thumbnail$/);
    if (thumbMatch) {
      const proj = PortfolioStore.findItem("projects", thumbMatch[1]);
      if (!proj) return false;
      proj.thumbnail = path;
      PortfolioStore.notifyChange();
      if (window.rerenderAllProjects) window.rerenderAllProjects();
      else if (window.renderPortfolio) window.renderPortfolio(["projects"]);
      return true;
    }
    const shotMatch = sourceKey.match(/^project\.([^.]+)\.screenshot\.(\d+)$/);
    if (shotMatch) {
      const proj = PortfolioStore.findItem("projects", shotMatch[1]);
      if (!proj) return false;
      const idx = parseInt(shotMatch[2], 10);
      const shots = proj.screenshots || proj.images || [];
      if (idx >= 0 && idx < shots.length) shots[idx] = path;
      proj.screenshots = shots;
      if (proj.images) proj.images = shots;
      PortfolioStore.notifyChange();
      if (window.rerenderAllProjects) window.rerenderAllProjects();
      else if (window.renderPortfolio) window.renderPortfolio(["projects"]);
      return true;
    }
    return false;
  }

  function clearImageSource(sourceKey) {
    return applyImageSource(sourceKey, "");
  }

  return {
    esc, sortByOrder, reorderItem, deleteItem, deleteProfileLine,
    injectGenericControls, handleListAction, handleLineAction,
    rerender, rerenderForList, compressImage, resolveAssetUrl, setImageSrc, localAssetUrl, githubRawUrl,
    fileToPersistentUrl, persistUploadedFile, initReveal, signalPortfolioReady,
    collectUsedImages, uploadImageWithFallback, applyImageSource, clearImageSource, toDraftImageUrl,
    getImagePreviewUrl, getGithubConfig,
    saveReturnScroll, restoreReturnScroll,
    SKILL_CATEGORIES, ACTIVITY_TYPES, DOC_VISIBILITY, PROJECT_STATUS,
  };
})();

window.CMS = CMS;
