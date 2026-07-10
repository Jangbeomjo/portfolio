/**
 * localStorage 기반 자동 저장 — 3초 debounce
 */
const EditorAutosave = (() => {
  const DRAFT_KEY = "portfolio_cms_draft";
  const META_KEY = "portfolio_cms_draft_meta";
  const DEBOUNCE_MS = 3000;
  let timer = null;
  let lastSavedAt = null;

  function saveDraft(data) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      lastSavedAt = new Date().toISOString();
      localStorage.setItem(META_KEY, JSON.stringify({ savedAt: lastSavedAt }));
      document.dispatchEvent(new CustomEvent("cms:autosaved", { detail: { savedAt: lastSavedAt } }));
    } catch (err) {
      console.warn("Draft autosave failed:", err);
      const msg = err?.name === "QuotaExceededError"
        ? "Draft 저장 실패 — 이미지가 너무 큽니다. 더 작은 사진을 사용하거나 GitHub Publish를 이용하세요."
        : "Draft 저장에 실패했습니다.";
      EditorUI?.showToast?.(msg, "error");
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(META_KEY);
    lastSavedAt = null;
    document.dispatchEvent(new CustomEvent("cms:autosaved", { detail: { savedAt: null } }));
  }

  function hasDraft() {
    return !!localStorage.getItem(DRAFT_KEY);
  }

  /** 데이터 변경 시 debounce 자동 저장 */
  function schedule(data) {
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(data), DEBOUNCE_MS);
  }

  function getLastSavedAt() {
    return lastSavedAt || loadMeta()?.savedAt || null;
  }

  /** 새로고침 시 draft 복구 여부 확인 */
  async function promptRestore() {
    if (!hasDraft()) return false;
    const meta = loadMeta();
    const when = meta?.savedAt ? new Date(meta.savedAt).toLocaleString("ko-KR") : "알 수 없음";
    return confirm(`저장되지 않은 Draft가 있습니다.\n(${when})\n\n복구하시겠습니까?`);
  }

  return {
    DRAFT_KEY, saveDraft, loadDraft, loadMeta, clearDraft,
    hasDraft, schedule, getLastSavedAt, promptRestore, DEBOUNCE_MS,
  };
})();

window.EditorAutosave = EditorAutosave;
