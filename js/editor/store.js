/**
 * 포트폴리오 데이터 스토어 — Draft 편집, Published 스냅샷, 히스토리 연동
 */
const PortfolioStore = (() => {
  let data = null;
  /** GitHub에 반영된 Published 스냅샷 (Diff 비교용) */
  let published = null;
  /** 취소 시 복원용 편집 시작 스냅샷 */
  let snapshot = null;

  const DEFAULT_ABOUT = {
    tagline: "", intro: "", growth: "", strengths: "", collaboration: "", goals: "",
  };

  const DEFAULT_RESUMES = { items: [], meta: {} };
  const DEFAULT_DOCUMENTS = { items: [], meta: {} };

  function normalizeDocuments(documents) {
    const base = documents?.items ? documents : DEFAULT_DOCUMENTS;
    if (typeof DocumentAccess !== "undefined") {
      return { ...base, items: DocumentAccess.normalizeAll(base.items) };
    }
    return base;
  }

  /** 전체 JSON 데이터 초기화 */
  function init(raw) {
    data = normalize(raw);
    published = deepClone(data);
    snapshot = deepClone(data);
  }

  /** raw 데이터를 통일 스키마로 정규화 */
  function normalize(raw) {
    const profile = raw.profile || {};
    if (!profile.about) profile.about = { ...DEFAULT_ABOUT, ...(raw.about || {}) };
    const skills = raw.skills || { bars: [], tags: [], stackLines: [], meta: {} };
    if (!skills.stackLines) skills.stackLines = [];
    const documents = typeof DocumentAccess !== "undefined"
      ? normalizeDocuments(raw.documents || DEFAULT_DOCUMENTS)
      : (raw.documents?.items ? raw.documents : DEFAULT_DOCUMENTS);
    return {
      profile,
      projects: raw.projects || { items: [], meta: {} },
      skills,
      education: raw.education || { items: [], meta: {} },
      experience: raw.experience || { items: [], meta: {} },
      certificates: raw.certificates || { items: [], meta: {} },
      training: raw.training || { items: [], meta: {} },
      awards: raw.awards || { items: [], meta: {} },
      activities: raw.activities || { items: [], meta: {} },
      about: profile.about || { ...DEFAULT_ABOUT },
      resumes: raw.resumes || DEFAULT_RESUMES,
      documents,
      images: raw.images || { items: [], meta: {} },
      seo: raw.seo || {},
      theme: raw.theme || {},
    };
  }

  function get() { return data; }
  function getPublished() { return published; }

  /** 히스토리 undo/redo용 — 전체 데이터 교체 */
  function loadFromSnapshot(snap) {
    data = deepClone(snap);
  }

  /** 취소 시 스냅샷 복원 */
  function restore() {
    data = deepClone(snapshot);
    return data;
  }

  /** Publish 성공 후 published + snapshot 갱신 */
  function commitSnapshot() {
    snapshot = deepClone(data);
    published = deepClone(data);
  }

  /** dot-path로 값 읽기 */
  function getPath(path) {
    return path.split(".").reduce((o, k) => o?.[k], data);
  }

  /** dot-path로 값 쓰기 + 변경 이벤트 */
  function setPath(path, value, { history = true } = {}) {
    const keys = path.split(".");
    let obj = data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    notifyChange(history);
  }

  /** 리스트 항목 찾기/업데이트/삭제 */
  function getItemList(listKey) {
    if (listKey === "stackLines") {
      if (!data.skills.stackLines) data.skills.stackLines = [];
      return data.skills.stackLines;
    }
    return data[listKey]?.items;
  }

  function findItem(listKey, id) {
    const list = getItemList(listKey);
    return list?.find((i) => i.id === id) || null;
  }

  function updateItem(listKey, id, field, value, opts) {
    const item = findItem(listKey, id);
    if (item) {
      item[field] = value;
      notifyChange(opts?.history !== false);
    }
  }

  function removeItem(listKey, id) {
    const list = getItemList(listKey);
    if (!list) return;
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list.splice(idx, 1);
      list.forEach((item, i) => { item.order = i; });
      notifyChange();
    }
  }

  function addItem(listKey, item) {
    if (listKey === "stackLines") {
      if (!data.skills.stackLines) data.skills.stackLines = [];
      data.skills.stackLines.push(item);
      notifyChange();
      return item;
    }
    if (!data[listKey]) data[listKey] = { items: [], meta: {} };
    data[listKey].items.push(item);
    notifyChange();
    return item;
  }

  function findSkill(id) {
    return data.skills?.bars?.find((s) => s.id === id) || null;
  }

  /** 프로필 배열 항목 (introLines, resumeLines) */
  function findProfileLine(arrayKey, id) {
    return data.profile[arrayKey]?.find((i) => i.id === id) || null;
  }

  function updateProfileLine(arrayKey, id, field, value) {
    const item = findProfileLine(arrayKey, id);
    if (item) {
      item[field] = value;
      notifyChange();
    }
  }

  function removeProfileLine(arrayKey, id) {
    const arr = data.profile[arrayKey];
    if (!arr) return;
    const idx = arr.findIndex((i) => i.id === id);
    if (idx >= 0) {
      arr.splice(idx, 1);
      notifyChange();
    }
  }

  function touchMeta(key) {
    if (data[key]) {
      data[key].meta = data[key].meta || {};
      data[key].meta.updatedAt = new Date().toISOString();
    }
  }

  function touchProfile() {
    data.profile.meta = data.profile.meta || {};
    data.profile.meta.updatedAt = new Date().toISOString();
  }

  /** Resume 항목 (자기소개서, 이력서 등) */
  function findResume(id) {
    return data.resumes?.items?.find((r) => r.id === id) || null;
  }

  function findResumeBySlug(slug) {
    return data.resumes?.items?.find((r) => r.slug === slug) || null;
  }

  /** Document 항목 */
  function findDocument(id) {
    return data.documents?.items?.find((d) => d.id === id) || null;
  }

  function findImage(id) {
    return data.images?.items?.find((i) => i.id === id) || null;
  }

  /** 데이터 변경 알림 — autosave, history, re-render */
  function notifyChange(recordHistory = true) {
    document.dispatchEvent(new CustomEvent("cms:data-changed", { detail: { recordHistory } }));
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /** JSON Export */
  function exportAll() {
    return deepClone(data);
  }

  /** JSON Import */
  function importAll(raw) {
    data = normalize({ ...raw, profile: raw.profile || raw });
    notifyChange(false);
    EditorHistory?.reset?.(data);
  }

  return {
    init, get, getPublished, loadFromSnapshot, restore, commitSnapshot,
    getPath, setPath, findItem, updateItem, removeItem, addItem,
    findSkill, touchMeta, touchProfile, deepClone,
    findProfileLine, updateProfileLine, removeProfileLine,
    findResume, findResumeBySlug, findDocument, findImage,
    exportAll, importAll, notifyChange,
  };
})();

window.PortfolioStore = PortfolioStore;
