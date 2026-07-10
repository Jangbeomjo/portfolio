/**
 * Draft / Preview / Publish 워크플로우
 * Edit → Draft 자동저장 → Preview → Diff → Publish → GitHub
 */
const EditorDraft = (() => {
  let previewMode = false;

  function isPreviewMode() { return previewMode; }

  /** Preview 모드 토글 — Draft 상태 미리보기 */
  function enterPreview() {
    previewMode = true;
    document.body.classList.add("preview-mode");
    document.body.classList.remove("edit-mode");
    EditorUI?.hideToolbar?.();
    EditorUI?.showPreviewBar?.();
    CMS?.rerender?.() || window.renderPortfolio?.();
  }

  function exitPreview() {
    previewMode = false;
    document.body.classList.remove("preview-mode");
    EditorUI?.hidePreviewBar?.();
    if (EditorAuth?.getSession?.()) {
      window.InlineEditor?.enterEditMode?.();
    } else {
      CMS?.rerender?.() || window.renderPortfolio?.();
    }
  }

  /** Published(JSON) vs Draft(현재 store) diff 요약 */
  function computeDiff(published, draft) {
    const changes = [];
    const sections = ["profile", "projects", "skills", "education", "experience", "resumes", "documents", "about", "seo", "theme", "certificates", "awards", "training", "images"];
    sections.forEach((key) => {
      const a = JSON.stringify(published?.[key] ?? null);
      const b = JSON.stringify(draft?.[key] ?? null);
      if (a !== b) changes.push({ section: key, label: sectionLabel(key) });
    });
    return changes;
  }

  function sectionLabel(key) {
    const map = {
      profile: "프로필", projects: "프로젝트", skills: "기술스택",
      education: "학력", experience: "경력/활동", resumes: "Resume",
      certificates: "자격증", awards: "수상", training: "교육/활동",
      images: "이미지 라이브러리",
    };
    return map[key] || key;
  }

  /** Diff 확인 모달 표시 후 Publish 진행 */
  function showDiffModal(published, draft, onPublish) {
    const changes = computeDiff(published, draft);
    if (!changes.length) {
      EditorUI.showToast("변경사항이 없습니다.", "info");
      return;
    }
    const list = changes.map((c) => `<li>${c.label}</li>`).join("");
    EditorUI.openModal({
      title: "변경사항 확인",
      body: `<p>다음 항목이 변경되었습니다:</p><ul class="editor-diff-list">${list}</ul><p class="editor-diff-note">Publish하면 GitHub에 커밋되고 Vercel이 재배포됩니다.</p>`,
      foot: `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="diffCancel">취소</button><button type="button" class="editor-toolbar__btn editor-toolbar__btn--primary" id="diffPublish">Publish</button>`,
    });
    document.getElementById("diffCancel").onclick = EditorUI.closeModal;
    document.getElementById("diffPublish").onclick = () => {
      EditorUI.closeModal();
      onPublish?.();
    };
  }

  return { isPreviewMode, enterPreview, exitPreview, computeDiff, showDiffModal };
})();

window.EditorDraft = EditorDraft;
