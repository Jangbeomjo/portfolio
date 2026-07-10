/**
 * 인라인 편집 UI — 툴바, Preview bar, OAuth 모달, 토스트, Confirm
 */
const EditorUI = (() => {
  let toolbar, previewBar, modal, toast;
  const handlers = {};

  function init() {
    if (toolbar) return;
    createToolbar();
    createPreviewBar();
    createModal();
    createToast();
    bindHistoryEvents();
  }

  function createToolbar() {
    toolbar = document.createElement("div");
    toolbar.id = "editorToolbar";
    toolbar.className = "editor-toolbar";
    toolbar.innerHTML = `
      <div class="editor-toolbar__meta">
        <span class="editor-toolbar__badge">편집 모드</span>
        <span class="editor-toolbar__autosave" id="editorAutosaveLabel"></span>
      </div>
      <div class="editor-toolbar__actions">
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--desktop-only" id="editorUndoBtn" title="Ctrl+Z" disabled>↶</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--desktop-only" id="editorRedoBtn" title="Ctrl+Y" disabled>↷</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--desktop-only" id="editorPreviewBtn" title="Preview">Preview</button>
        <button type="button" class="editor-toolbar__btn" id="editorSeoBtn" title="SEO">SEO</button>
        <button type="button" class="editor-toolbar__btn" id="editorThemeBtn" title="테마">테마</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--desktop-only" id="editorGithubBtn" title="GitHub">GitHub</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--desktop-only" id="editorBackupBtn" title="백업">백업</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="editorClearDraftBtn" title="Draft 삭제">Draft 삭제</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost editor-toolbar__btn--desktop-only" id="editorCancelBtn">취소</button>
        <button type="button" class="editor-toolbar__btn" id="editorSaveBtn" title="Ctrl+S">Draft 저장</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--primary" id="editorPublishBtn">Publish</button>
      </div>
      <div class="editor-toolbar__session">
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--exit editor-toolbar__btn--mobile-only" id="editorExitBtn">편집종료</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="editorLogoutBtn">로그아웃</button>
      </div>`;
    document.body.appendChild(toolbar);

    bindOnce("editorUndoBtn", () => handlers.undo?.());
    bindOnce("editorRedoBtn", () => handlers.redo?.());
    bindOnce("editorPreviewBtn", () => handlers.preview?.());
    bindOnce("editorSeoBtn", () => handlers.seo?.());
    bindOnce("editorThemeBtn", () => handlers.theme?.());
    bindOnce("editorGithubBtn", () => handlers.github?.());
    bindOnce("editorBackupBtn", () => handlers.backup?.());
    bindOnce("editorClearDraftBtn", () => handlers.clearDraft?.());
    bindOnce("editorCancelBtn", () => handlers.cancel?.());
    bindOnce("editorExitBtn", () => handlers.exit?.());
    bindOnce("editorSaveBtn", () => handlers.save?.());
    bindOnce("editorPublishBtn", () => handlers.publish?.());
    bindOnce("editorLogoutBtn", () => handlers.logout?.());

    document.addEventListener("cms:autosaved", (e) => {
      updateAutosaveLabel(e.detail?.savedAt);
    });
  }

  function createPreviewBar() {
    previewBar = document.createElement("div");
    previewBar.id = "editorPreviewBar";
    previewBar.className = "editor-preview-bar";
    previewBar.innerHTML = `
      <span>Preview 모드 — Draft 미리보기</span>
      <button type="button" class="editor-toolbar__btn editor-toolbar__btn--primary" id="previewBackBtn">편집으로 돌아가기</button>`;
    document.body.appendChild(previewBar);
    document.getElementById("previewBackBtn")?.addEventListener("click", () => EditorDraft.exitPreview());
  }

  function createModal() {
    modal = document.createElement("div");
    modal.id = "editorModal";
    modal.className = "editor-modal";
    modal.innerHTML = `<div class="editor-modal__backdrop"></div><div class="editor-modal__box"><div class="editor-modal__head"><h3></h3><button type="button" class="editor-modal__close">×</button></div><div class="editor-modal__body"></div><div class="editor-modal__foot"></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector(".editor-modal__backdrop").addEventListener("click", closeModal);
    modal.querySelector(".editor-modal__close").addEventListener("click", closeModal);
  }

  function createToast() {
    toast = document.createElement("div");
    toast.id = "editorToast";
    toast.className = "editor-toast";
    document.body.appendChild(toast);
  }

  function bindOnce(id, fn) {
    document.getElementById(id)?.addEventListener("click", fn);
  }

  function bindHistoryEvents() {
    document.addEventListener("cms:history-changed", updateHistoryButtons);
  }

  function updateHistoryButtons() {
    const undoBtn = document.getElementById("editorUndoBtn");
    const redoBtn = document.getElementById("editorRedoBtn");
    if (undoBtn) undoBtn.disabled = !EditorHistory?.canUndo?.();
    if (redoBtn) redoBtn.disabled = !EditorHistory?.canRedo?.();
  }

  function updateAutosaveLabel(iso) {
    const el = document.getElementById("editorAutosaveLabel");
    if (!el) return;
    if (!iso) { el.textContent = ""; return; }
    el.textContent = `자동저장: ${new Date(iso).toLocaleTimeString("ko-KR")}`;
  }

  function showToolbar() { init(); toolbar.classList.add("is-visible"); updateHistoryButtons(); }
  function hideToolbar() { toolbar?.classList.remove("is-visible"); }
  function showPreviewBar() { init(); previewBar.classList.add("is-visible"); }
  function hidePreviewBar() { previewBar?.classList.remove("is-visible"); }

  function openModal({ title, body, foot = "" }) {
    init();
    modal.querySelector(".editor-modal__head h3").textContent = title;
    modal.querySelector(".editor-modal__body").innerHTML = body;
    modal.querySelector(".editor-modal__foot").innerHTML = foot;
    modal.classList.add("is-open");
  }

  function closeModal() { modal?.classList.remove("is-open"); }

  function showToast(msg, type = "info") {
    init();
    toast.textContent = msg;
    toast.className = `editor-toast editor-toast--${type} is-show`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("is-show"), 2800);
  }

  function showLoading(msg) {
    openModal({ title: "처리 중", body: `<div class="cms-skeleton cms-skeleton--modal"></div><p class="editor-loading-text">${msg}</p>` });
  }

  /** Confirm Dialog — Promise 기반 */
  function confirm(message, { title = "확인" } = {}) {
    return new Promise((resolve) => {
      openModal({
        title,
        body: `<p>${message}</p>`,
        foot: `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="confirmNo">취소</button><button type="button" class="editor-toolbar__btn editor-toolbar__btn--primary" id="confirmYes">확인</button>`,
      });
      document.getElementById("confirmNo").onclick = () => { closeModal(); resolve(false); };
      document.getElementById("confirmYes").onclick = () => { closeModal(); resolve(true); };
    });
  }

  /** Skeleton 표시 */
  function showSkeleton(container) {
    if (!container) return;
    container.classList.add("cms-skeleton-wrap");
    container.innerHTML = Array(3).fill('<div class="cms-skeleton cms-skeleton--block"></div>').join("");
  }

  function showTokenInputModal(onSubmit, onCancel) {
    openModal({
      title: "GitHub 로그인",
      body: `<p style="margin-bottom:0.75rem;color:var(--muted)">GitHub Personal Access Token을 입력하세요.</p>
        <input id="editorPatInput" type="password" placeholder="ghp_xxxxxxxxxxxx" style="width:100%;padding:0.7rem;border:1px solid var(--border);border-radius:0.5rem;box-sizing:border-box;" />`,
      foot: `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="tokenCancelBtn">취소</button><button type="button" class="editor-toolbar__btn editor-toolbar__btn--primary" id="tokenSubmitBtn">로그인</button>`,
    });
    const input = document.getElementById("editorPatInput");
    document.getElementById("tokenSubmitBtn")?.addEventListener("click", () => { closeModal(); onSubmit?.(input?.value?.trim()); });
    document.getElementById("tokenCancelBtn")?.addEventListener("click", () => { closeModal(); onCancel?.(); });
    input?.focus();
  }

  function showOAuthModal(device, onCancel) {
    openModal({
      title: "GitHub 로그인",
      body: `<p style="margin-bottom:1rem;color:var(--muted)">아래 코드를 GitHub에 입력하여 인증하세요.</p>
        <div class="editor-device-code"><strong>${device.user_code}</strong></div>
        <a href="${device.verification_uri}" target="_blank" rel="noopener" class="editor-oauth-link">GitHub 인증 페이지 열기 →</a>
        <p class="editor-loading-text" style="margin-top:1rem">인증 대기 중...</p>`,
      foot: `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="oauthCancelBtn">취소</button>`,
    });
    document.getElementById("oauthCancelBtn")?.addEventListener("click", () => { closeModal(); onCancel?.(); });
  }

  function onSave(fn) { handlers.save = fn; }
  function onPublish(fn) { handlers.publish = fn; }
  function onPreview(fn) { handlers.preview = fn; }
  function onCancel(fn) { handlers.cancel = fn; }
  function onLogout(fn) { handlers.logout = fn; }
  function onUndo(fn) { handlers.undo = fn; }
  function onRedo(fn) { handlers.redo = fn; }
  function onSeo(fn) { handlers.seo = fn; }
  function onTheme(fn) { handlers.theme = fn; }
  function onGithub(fn) { handlers.github = fn; }
  function onBackup(fn) { handlers.backup = fn; }
  function onClearDraft(fn) { handlers.clearDraft = fn; }
  function onExit(fn) { handlers.exit = fn; }

  return {
    init, showToolbar, hideToolbar, showPreviewBar, hidePreviewBar,
    openModal, closeModal, showToast, showLoading, confirm,
    onSave, onPublish, onPreview, onCancel, onLogout, onUndo, onRedo,
    onSeo, onTheme, onGithub, onBackup, onClearDraft, onExit,
    showOAuthModal, showTokenInputModal,
    updateHistoryButtons, updateAutosaveLabel, showSkeleton,
  };
})();

window.EditorUI = EditorUI;
