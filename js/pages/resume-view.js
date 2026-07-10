/**
 * Resume 상세 — 자기소개서/이력서 작성 폼
 */
(function resumeViewPage() {
  const BASE = "../";
  let currentResume = null;
  let dragId = null;

  const RESUME_DEFAULT_SECTIONS = [
    { title: "기본 정보", content: "이름, 연락처, GitHub 등" },
    { title: "EDUCATION", content: "" },
    { title: "학력", content: "" },
    { title: "경력", content: "" },
    { title: "프로젝트", content: "" },
    { title: "기술 스택", content: "" },
  ];

  const COVER_PRESETS = ["지원동기", "성장과정", "자기소개", "프로젝트 경험", "협업 경험", "성격의 장단점", "입사 후 포부"];
  const RESUME_PRESETS = ["기본 정보", "EDUCATION", "학력", "경력", "프로젝트", "기술 스택", "자격증", "수상"];
  const CAREER_PRESETS = ["경력 요약", "주요 프로젝트", "기술 역량", "성과"];

  async function bootstrap() {
    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");
    if (!slug) { location.href = "resume.html"; return; }
    const wantEdit = params.get("edit") === "1" || params.get("write") === "1";

    try {
      const raw = await DataLoader.loadAllRaw();
      PortfolioStore.init(raw);
      await CMSPageActions.restoreDraftOnLoad({ slug });
      EditorHistory.reset(PortfolioStore.get());

      currentResume = PortfolioStore.findResumeBySlug(slug);
      if (!currentResume) {
        currentResume = CMSPageActions.recoverPendingResume(slug);
      }
      if (!currentResume) {
        document.getElementById("resumeDoc").innerHTML = "<p class='doc-empty-hint'>문서를 찾을 수 없습니다. <a href='resume.html'>Resume 목록</a>으로 돌아가세요.</p>";
        CMSHeader.render();
        CMS.initReveal?.();
        CMS.signalPortfolioReady?.();
        if (EditorAuth?.getSession?.()) await CMSPageActions.bootEditIfRequested(wantEdit);
        return;
      }

      ensureSections();
      renderSectionPresets();
      bindSectionHub();
      renderDocument();
      CMSHeader.render();
      CMS.initReveal?.();
      CMS.signalPortfolioReady?.();
      if (EditorAuth?.getSession?.()) {
        await CMSPageActions.bootEditIfRequested(wantEdit);
        if (wantEdit && document.body.classList.contains("edit-mode")) focusFirstField();
      }
    } catch (err) {
      console.error(err);
      showLoadError();
    }
  }

  function showLoadError() {
    const doc = document.getElementById("resumeDoc");
    const fileHint = DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()
      ? "파일을 직접 열었을 때는 <code>js/portfolio-data.js</code>가 필요합니다. <code>python scripts/bundle-data.py</code> 실행 후 다시 열거나 <code>start-server.bat</code>을 사용하세요."
      : "<code>start-server.bat</code>으로 localhost에서 다시 시도하세요.";
    if (doc) {
      doc.innerHTML = `<p class="doc-empty-hint">데이터를 불러오지 못했습니다.<br>${fileHint}<br><a href="../index.html">홈</a></p>`;
    }
    if (DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()) {
      EditorUI?.showToast?.("데이터 번들이 없습니다. bundle-data.py 실행 또는 로컬 서버를 사용하세요.", "error");
    } else {
      EditorUI?.showToast?.("데이터를 불러오지 못했습니다.", "error");
    }
  }

  function focusFirstField() {
    renderDocument();
    document.querySelector(".resume-form-textarea:not([readonly])")?.focus();
  }

  function ensureSections() {
    if (!currentResume.sections) currentResume.sections = [];
    if (currentResume.sections.length > 0) return;

    const templates = currentResume.type === "resume" || currentResume.type === "career-description"
      ? RESUME_DEFAULT_SECTIONS
      : [
        { title: "지원동기", content: "" },
        { title: "성장과정", content: "" },
        { title: "자기소개", content: "" },
        { title: "프로젝트 경험", content: "" },
        { title: "입사 후 포부", content: "" },
      ];

    currentResume.sections = templates.map((t, i) => ({
      id: EditorGitHub.generateId("s"),
      title: t.title,
      content: t.content,
      order: i,
    }));
    PortfolioStore.notifyChange(false);
  }

  function isWritable() {
    return document.body.classList.contains("edit-mode") && !!EditorAuth?.getSession?.();
  }

  function renderDocument() {
    const doc = document.getElementById("resumeDoc");
    const titleEl = document.getElementById("resumeDocTitle");
    const meta = document.getElementById("resumeDocMeta");
    const slug = new URLSearchParams(location.search).get("slug");
    if (slug) currentResume = PortfolioStore.findResumeBySlug(slug) || currentResume;
    if (!currentResume) return;

    if (titleEl) titleEl.textContent = currentResume.title;

    const sections = [...(currentResume.sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const canWrite = isWritable();
    const filled = sections.filter((s) => (s.content || "").trim()).length;

    const pdfPath = currentResume.storage?.path || currentResume.pdfUrl;
    if (meta) {
      const typeLabel = { "cover-letter": "자기소개서", resume: "이력서", "career-description": "경력기술서" }[currentResume.type] || "문서";
      meta.innerHTML = `
        <span class="resume-doc-meta__type">${typeLabel}</span>
        <span class="resume-doc-meta__status resume-doc-meta__status--${filled ? "ok" : "missing"}">${filled ? `작성됨 ${filled}/${sections.length}` : "미작성"}</span>
        ${pdfPath ? `<a href="${CMS.resolveAssetUrl(pdfPath)}" target="_blank" rel="noopener" class="resume-doc-meta__link">PDF</a>` : ""}
        ${canWrite ? `<button type="button" class="resume-doc-meta__btn" id="resumeUploadPdf">PDF 업로드</button>` : ""}`;
      document.getElementById("resumeUploadPdf")?.addEventListener("click", uploadPdf);
    }

    if (!doc) return;

    if (!sections.length) {
      doc.innerHTML = `<p class="resume-form-empty-state">위 「항목 추가」에서 <strong>+ 지원동기</strong>, <strong>+ 자기소개</strong> 등을 눌러 섹션을 추가하세요.</p>`;
    } else {
      doc.innerHTML = sections.map((s) => renderSectionForm(s, canWrite)).join("");
    }

    document.querySelector(".resume-doc-hint")?.remove();

    bindSectionForm(canWrite);
    if (canWrite) bindDragSort();
    bindFormUnlock();

    document.dispatchEvent(new CustomEvent("portfolio:rendered"));
  }

  function renderSectionForm(s, canWrite) {
    if (!canWrite) {
      const content = (s.content || "").trim();
      return `<section class="resume-doc-section is-locked" data-section-id="${s.id}">
        <h3 class="resume-doc-section__title">${esc(s.title)}</h3>
        <div class="resume-doc-section__content">${content ? escText(s.content) : '<span class="resume-doc-section__empty">내용 없음</span>'}</div>
      </section>`;
    }

    const placeholder = sectionPlaceholder(s.title);
    return `<section class="resume-form-section is-editable" data-section-id="${s.id}" draggable="true">
      <div class="resume-form-section__head">
        <label class="resume-form-label">항목 제목</label>
        <input type="text" class="resume-form-input" data-section-field="title" data-section-id="${s.id}" value="${escAttr(s.title)}" placeholder="예: 지원동기">
      </div>
      <div class="resume-form-section__body">
        <label class="resume-form-label">내용</label>
        <textarea class="resume-form-textarea" data-section-field="content" data-section-id="${s.id}" rows="8" placeholder="${escAttr(placeholder)}">${escText(s.content)}</textarea>
      </div>
      <div class="resume-form-section__controls page-controls">
        <button type="button" class="edit-ctrl-btn" data-section-action="up" title="위로">↑</button>
        <button type="button" class="edit-ctrl-btn" data-section-action="down" title="아래로">↓</button>
        <button type="button" class="edit-ctrl-btn" data-section-action="copy" title="복사">⎘</button>
        <button type="button" class="edit-ctrl-btn" data-section-action="delete" title="삭제">×</button>
      </div>
    </section>`;
  }

  function bindFormUnlock() {
    document.querySelectorAll(".resume-doc-section.is-locked, .resume-form-section.is-locked").forEach((section) => {
      section.onclick = (e) => {
        if (e.target.closest(".resume-form-section__controls")) return;
        if (!EditorAuth?.getSession?.()) {
          EditorUI.showToast("편집하려면 상단 Login with GitHub를 눌러 주세요.", "info");
          return;
        }
        CMSPageActions.runWithEditor(() => {
          renderDocument();
          section.querySelector(".resume-form-textarea")?.focus();
        });
      };
    });
  }

  function sectionPlaceholder(title) {
    const map = {
      "지원동기": "지원 동기와 회사에 대한 관심을 작성하세요.",
      "자기소개": "본인을 소개하는 내용을 작성하세요.",
      "성장과정": "성장 배경과 경험을 작성하세요.",
      EDUCATION: "학력 사항을 작성하세요.",
    };
    return map[title] || `${title} 내용을 입력하세요.`;
  }

  function renderSectionPresets() {
    const wrap = document.getElementById("sectionPresetBtns");
    if (!wrap || !currentResume) return;
    const presets = currentResume.type === "cover-letter"
      ? COVER_PRESETS
      : currentResume.type === "career-description"
        ? CAREER_PRESETS
        : RESUME_PRESETS;
    wrap.innerHTML = presets.map((title) =>
      `<button type="button" class="section-preset-btn" data-preset-title="${escAttr(title)}">+ ${esc(title)}</button>`
    ).join("");
  }

  function bindSectionHub() {
    document.getElementById("sectionPresetBtns")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-preset-title]");
      if (!btn) return;
      CMSPageActions.runWithEditor(() => addSection(btn.dataset.presetTitle));
    });
    document.getElementById("sectionCustomAddBtn")?.addEventListener("click", () => {
      CMSPageActions.runWithEditor(() => {
        const title = prompt("섹션 제목:", "새 항목");
        if (title?.trim()) addSection(title.trim());
      });
    });
  }

  function addSection(title) {
    currentResume.sections = currentResume.sections || [];
    if (currentResume.sections.some((s) => s.title === title)) {
      EditorUI.showToast(`「${title}」 항목이 이미 있습니다.`, "info");
      return;
    }
    currentResume.sections.push({
      id: EditorGitHub.generateId("s"),
      title,
      content: "",
      order: currentResume.sections.length,
    });
    PortfolioStore.notifyChange();
    renderDocument();
    EditorUI.showToast(`「${title}」 항목이 추가되었습니다.`, "success");
  }

  function bindSectionForm(canWrite) {
    document.querySelectorAll("[data-section-field]").forEach((el) => {
      if (canWrite) el.removeAttribute("readonly");
      if (el.dataset.sectionBound) return;
      el.dataset.sectionBound = "1";
      const save = () => {
        if (!isWritable()) return;
        const id = el.dataset.sectionId;
        const field = el.dataset.sectionField;
        const section = currentResume.sections.find((s) => s.id === id);
        if (!section) return;
        section[field] = (el.value ?? el.textContent).trim();
        PortfolioStore.notifyChange();
      };
      el.addEventListener("input", save);
      el.addEventListener("blur", save);
    });

    document.querySelectorAll("[data-section-action]").forEach((btn) => {
      if (btn.dataset.sectionBtnBound) return;
      btn.dataset.sectionBtnBound = "1";
      btn.addEventListener("click", () => {
        CMSPageActions.runWithEditor(() => handleSectionAction(btn));
      });
    });
  }

  function handleSectionAction(btn) {
    const sectionEl = btn.closest("[data-section-id]");
    const id = sectionEl.dataset.sectionId;
    const sections = currentResume.sections;
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const action = btn.dataset.sectionAction;
    if (action === "delete") {
      EditorUI.confirm("이 항목을 삭제하시겠습니까?").then((ok) => {
        if (!ok) return;
        sections.splice(idx, 1);
        sections.forEach((s, i) => { s.order = i; });
        PortfolioStore.notifyChange();
        renderDocument();
      });
      return;
    }
    if (action === "copy") {
      sections.splice(idx + 1, 0, {
        ...sections[idx],
        id: EditorGitHub.generateId("s"),
        title: `${sections[idx].title} (복사)`,
      });
    } else if (action === "up" && idx > 0) {
      [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
    } else if (action === "down" && idx < sections.length - 1) {
      [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
    } else return;
    sections.forEach((s, i) => { s.order = i; });
    PortfolioStore.notifyChange();
    renderDocument();
  }

  async function uploadPdf() {
    const file = await EditorUpload.pick("application/pdf");
    if (!file) return;
    EditorUI.showLoading("PDF 업로드 중...");
    try {
      currentResume.pdfUrl = await CMS.persistUploadedFile(file);
      PortfolioStore.notifyChange();
      EditorUI.closeModal();
      renderDocument();
      EditorUI.showToast("PDF 업로드 완료", "success");
    } catch (err) {
      EditorUI.closeModal();
      EditorUI.showToast(err.message, "error");
    }
  }

  function bindDragSort() {
    document.querySelectorAll(".resume-form-section[draggable]").forEach((el) => {
      el.addEventListener("dragstart", () => { dragId = el.dataset.sectionId; el.classList.add("is-dragging"); });
      el.addEventListener("dragend", () => { dragId = null; el.classList.remove("is-dragging"); });
      el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("is-drag-over"); });
      el.addEventListener("dragleave", () => el.classList.remove("is-drag-over"));
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        el.classList.remove("is-drag-over");
        if (!dragId || dragId === el.dataset.sectionId) return;
        const sections = currentResume.sections;
        const fromIdx = sections.findIndex((s) => s.id === dragId);
        const toIdx = sections.findIndex((s) => s.id === el.dataset.sectionId);
        if (fromIdx < 0 || toIdx < 0) return;
        const [moved] = sections.splice(fromIdx, 1);
        sections.splice(toIdx, 0, moved);
        sections.forEach((s, i) => { s.order = i; });
        PortfolioStore.notifyChange();
        renderDocument();
      });
    });
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function escAttr(s) {
    return esc(s).replace(/"/g, "&quot;");
  }

  function escText(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
  window.renderResumeDocument = renderDocument;
})();
