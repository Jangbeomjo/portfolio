/**
 * 서브 페이지 — 로그인 후 편집 모드 진입 + Draft/페이지 이동 헬퍼
 */
const CMSPageActions = (() => {
  const RESUME_NAV_KEY = "cms:resume-nav";
  const PENDING_RESUME_PREFIX = "cms:pending-resume:";

  function saveDraftNow() {
    if (!PortfolioStore?.get?.()) return;
    EditorAutosave?.saveDraft?.(PortfolioStore.get());
  }

  function stashPendingResume(item) {
    if (!item?.slug) return;
    try {
      sessionStorage.setItem(`${PENDING_RESUME_PREFIX}${item.slug}`, JSON.stringify(item));
      sessionStorage.setItem(RESUME_NAV_KEY, item.slug);
    } catch (err) {
      console.warn("[CMS] pending resume stash failed:", err);
    }
  }

  function recoverPendingResume(slug) {
    if (!slug) return null;
    try {
      const raw = sessionStorage.getItem(`${PENDING_RESUME_PREFIX}${slug}`);
      if (!raw) return null;
      const item = JSON.parse(raw);
      const items = PortfolioStore.get().resumes?.items || [];
      if (!items.some((r) => r.slug === slug)) {
        items.push(item);
        PortfolioStore.get().resumes.items = items;
        PortfolioStore.notifyChange(false);
      }
      sessionStorage.removeItem(`${PENDING_RESUME_PREFIX}${slug}`);
      sessionStorage.removeItem(RESUME_NAV_KEY);
      return PortfolioStore.findResumeBySlug(slug) || item;
    } catch (err) {
      console.warn("[CMS] pending resume recover failed:", err);
      return null;
    }
  }

  function stripEditParamsFromUrl() {
    try {
      const url = new URL(location.href);
      if (!url.searchParams.has("edit") && !url.searchParams.has("write")) return;
      url.searchParams.delete("edit");
      url.searchParams.delete("write");
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch { /* ignore */ }
  }

  /** 페이지 로드 시 — Resume 이동 직후에만 Draft 자동 복구 (confirm 없음) */
  async function restoreDraftOnLoad({ slug } = {}) {
    if (!EditorAuth?.getSession?.() || !EditorAutosave?.hasDraft?.()) return false;
    const draft = EditorAutosave.loadDraft();
    if (!draft) return false;

    const navSlug = sessionStorage.getItem(RESUME_NAV_KEY);
    const slugInDraft = slug && draft.resumes?.items?.some((r) => r.slug === slug);
    const fromResumeNav = slug && navSlug === slug;

    if (slugInDraft || fromResumeNav) {
      PortfolioStore.importAll(draft);
      if (fromResumeNav) sessionStorage.removeItem(RESUME_NAV_KEY);
      return true;
    }
    return false;
  }

  /** 로그인 직후 — 사용자가 명시적으로 로그인했을 때만 Draft 복구 확인 */
  async function offerDraftRestoreAfterLogin() {
    if (!EditorAuth?.getSession?.() || !EditorAutosave?.hasDraft?.()) return false;
    const restore = await EditorAutosave.promptRestore();
    if (!restore) return false;
    const draft = EditorAutosave.loadDraft();
    if (!draft) return false;
    PortfolioStore.importAll(draft);
    CMS?.rerender?.();
    window.renderResumeDocument?.();
    window.renderResumeList?.();
    window.renderDocuments?.();
    window.renderImageLibrary?.();
    return true;
  }

  function navigateToResumeEditor(slug) {
    saveDraftNow();
    window.location.href = `resume-view.html?slug=${encodeURIComponent(slug)}&edit=1`;
  }

  /** URL에 edit=1 이어도 로그인된 경우에만 편집 모드 진입 (로그인 모달 자동 표시 안 함) */
  async function bootEditIfRequested(wantEdit) {
    if (!wantEdit || !EditorAuth?.getSession?.()) return;
    const valid = await EditorAuth.validateSession?.();
    if (!valid) return;
    await InlineEditor.enterEditMode();
  }

  async function ensureEditor() {
    if (!EditorAuth?.getSession?.()) {
      try {
        await InlineEditor.startOAuth();
        CMSHeader?.render?.();
      } catch (err) {
        EditorUI.showToast(err?.message || "로그인에 실패했습니다.", "error");
        return false;
      }
    }
    const valid = await EditorAuth.validateSession?.();
    if (!valid) {
      EditorUI.showToast("GitHub 세션이 유효하지 않습니다. 다시 로그인해 주세요.", "error");
      return false;
    }
    if (!document.body.classList.contains("edit-mode")) {
      await InlineEditor.enterEditMode();
      CMSHeader?.render?.();
    }
    return true;
  }

  async function runWithEditor(fn) {
    const ok = await ensureEditor();
    if (!ok) return false;
    try {
      await fn();
      return true;
    } catch (err) {
      EditorUI.showToast(err?.message || "작업 실패", "error");
      return false;
    }
  }

  return {
    ensureEditor,
    runWithEditor,
    saveDraftNow,
    stashPendingResume,
    recoverPendingResume,
    restoreDraftOnLoad,
    offerDraftRestoreAfterLogin,
    navigateToResumeEditor,
    bootEditIfRequested,
    stripEditParamsFromUrl,
  };
})();

window.CMSPageActions = CMSPageActions;
