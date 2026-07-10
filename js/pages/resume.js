/**
 * Resume 페이지 — 직접 작성 + 작성/파일 상태 표시
 */
(function resumePage() {
  const BASE = "../";
  let ready = false;
  let activeFilter = "all";

  function canEdit() {
    return document.body.classList.contains("edit-mode") && !!EditorAuth?.getSession?.();
  }

  async function bootstrap() {
    if (ready) return;
    try {
      const raw = await DataLoader.loadAllRaw();
      PortfolioStore.init(raw);
      await CMSPageActions.restoreDraftOnLoad();
      EditorHistory.reset(PortfolioStore.get());
      bindTypeTabs();
      bindActionHub();
      renderResumeList();
      renderEducationPanel();
      CMSHeader.render();
      CMS.initReveal?.();
      CMS.signalPortfolioReady?.();
      setTimeout(() => CMS.restoreReturnScroll?.(), 80);
      ready = true;
    } catch (err) {
      console.error(err);
      showPageLoadError("resumeGrid", "Resume 데이터를 불러오지 못했습니다.");
    }
  }

  function showPageLoadError(containerId, msg) {
    const el = document.getElementById(containerId);
    const fileHint = DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()
      ? "파일을 직접 열었을 때는 <code>js/portfolio-data.js</code>가 필요합니다. 터미널에서 <code>python scripts/bundle-data.py</code> 실행 후 다시 열거나, <code>start-server.bat</code>으로 localhost를 사용하세요."
      : "네트워크 또는 데이터 파일 문제일 수 있습니다. <code>start-server.bat</code>으로 localhost에서 다시 시도하세요.";
    if (el) {
      el.innerHTML = `<p class="doc-empty-hint">${msg}<br>${fileHint}</p>`;
    }
    if (DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()) {
      EditorUI?.showToast?.("데이터 번들이 없습니다. bundle-data.py 실행 또는 로컬 서버를 사용하세요.", "error");
    } else {
      EditorUI?.showToast?.("데이터를 불러오지 못했습니다.", "error");
    }
  }

  function bindActionHub() {
    document.querySelectorAll("[data-resume-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.resumeAdd;
        const labels = { "cover-letter": "새 자기소개서", resume: "새 이력서", "career-description": "새 경력기술서" };
        CMSPageActions.runWithEditor(() => addResume(type, labels[type]));
      });
    });
    document.getElementById("resumeEduAddBtn")?.addEventListener("click", () => {
      CMSPageActions.runWithEditor(() => addEducationItem());
    });
  }

  function renderEducationPanel() {
    const list = document.getElementById("resumeEduList");
    if (!list) return;
    const canWrite = canEdit();
    const items = CMS.sortByOrder(PortfolioStore.get().education?.items || []);
    if (!items.length) {
      list.innerHTML = canWrite
        ? `<li class="resume-edu-empty">등록된 학력이 없습니다. 「+ 학력 추가」를 누르세요.</li>`
        : `<li class="resume-edu-empty">등록된 학력이 없습니다.</li>`;
      return;
    }
    list.innerHTML = items.map((e) => `
      <li class="resume-edu-item" data-edu-id="${e.id}">
        <div class="resume-edu-item__main">
          <strong ${canWrite ? `contenteditable="true" data-edu-field="school" data-edu-id="${e.id}"` : ""}>${esc(e.school || e.title || "학교명")}</strong>
          <span ${canWrite ? `contenteditable="true" data-edu-field="major" data-edu-id="${e.id}"` : ""}>${esc(e.major || e.desc || "")}</span>
        </div>
        <time ${canWrite ? `contenteditable="true" data-edu-field="period" data-edu-id="${e.id}"` : ""}>${esc(e.period || "")}</time>
        ${canWrite ? `<div class="page-controls">
          <button type="button" class="edit-ctrl-btn resume-edu-delete" data-edu-delete="${e.id}" title="삭제">×</button>
        </div>` : ""}
      </li>`).join("");
    bindEducationEdit();
  }

  function bindEducationEdit() {
    document.querySelectorAll("[data-edu-field]").forEach((el) => {
      if (el.dataset.eduBound) return;
      el.dataset.eduBound = "1";
      el.classList.add("is-editable");
      el.addEventListener("blur", () => {
        if (!document.body.classList.contains("edit-mode") || !EditorAuth?.getSession?.()) return;
        const item = PortfolioStore.findItem("education", el.dataset.eduId);
        if (item) {
          item[el.dataset.eduField] = el.textContent.trim();
          if (el.dataset.eduField === "school") item.title = item.school;
          PortfolioStore.notifyChange();
        }
      });
    });
    document.querySelectorAll("[data-edu-delete]").forEach((btn) => {
      if (btn.dataset.eduDelBound) return;
      btn.dataset.eduDelBound = "1";
      btn.onclick = () => {
        CMSPageActions.runWithEditor(async () => {
          const ok = await EditorUI.confirm("이 학력을 삭제하시겠습니까?");
          if (!ok) return;
          PortfolioStore.removeItem("education", btn.dataset.eduDelete);
          renderEducationPanel();
        });
      };
    });
  }

  function addEducationItem() {
    const school = prompt("학교명:", "OO대학교");
    if (!school) return;
    PortfolioStore.addItem("education", {
      id: EditorGitHub.generateId("edu"),
      school,
      major: "",
      period: "",
      desc: "",
      gpa: "",
      graduated: "",
      order: PortfolioStore.get().education.items.length,
    });
    renderEducationPanel();
    EditorUI.showToast("학력이 추가되었습니다. Publish하면 메인 EDUCATION에 반영됩니다.", "success");
  }

  function bindTypeTabs() {
    document.getElementById("resumeTypeTabs")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-filter]");
      if (!tab) return;
      activeFilter = tab.dataset.filter;
      document.querySelectorAll(".resume-type-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
      renderResumeList();
    });
  }

  function getWriteStatus(r) {
    const sections = r.sections || [];
    const filled = sections.filter((s) => (s.content || "").trim()).length;
    const hasPdf = !!(r.storage?.path || r.pdfUrl);
    if (r.type === "portfolio-pdf") {
      return { label: hasPdf ? "PDF 등록됨" : "PDF 없음", cls: hasPdf ? "ok" : "missing", filled, total: sections.length };
    }
    if (filled > 0) return { label: "작성됨", cls: "ok", filled, total: sections.length };
    if (sections.length > 0) return { label: "미작성", cls: "draft", filled: 0, total: sections.length };
    return { label: "미작성", cls: "missing", filled: 0, total: 0 };
  }

  function getExcerpt(r) {
    const section = (r.sections || []).find((s) => (s.content || "").trim());
    if (!section) return canEdit() ? "아직 작성된 내용이 없습니다. 「직접 작성」을 눌러 시작하세요." : "아직 작성된 내용이 없습니다.";
    const text = section.content.trim();
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }

  function renderResumeList() {
    const grid = document.getElementById("resumeGrid");
    const summaryEl = document.getElementById("resumeSummary");
    if (!grid) return;
    const isEdit = canEdit();
    const allItems = [...(PortfolioStore.get().resumes?.items || [])]
      .filter((r) => r.type !== "portfolio-pdf")
      .filter((r) => isEdit || r.visibility !== "private");

    const items = allItems
      .filter((r) => activeFilter === "all" || r.type === activeFilter)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const written = allItems.filter((r) => getWriteStatus(r).filled > 0).length;
    const empty = allItems.length - written;
    if (summaryEl) {
      summaryEl.innerHTML = `<span>전체 ${allItems.length}개</span><span>작성됨 ${written}개</span><span>미작성 ${empty}개</span>`;
    }

    if (!items.length) {
      grid.innerHTML = isEdit
        ? `<p class="doc-empty-hint">「작성 홈」에서 <strong>+ 자기소개서</strong> / <strong>+ 이력서</strong>를 눌러 새 문서를 추가하세요.</p>`
        : `<p class="doc-empty-hint">등록된 이력서·자기소개서가 없습니다.</p>`;
    } else {
      grid.innerHTML = items.map((r) => renderResumeCard(r)).join("");
    }

    bindResumeCardControls();
    bindResumeInlineEdit();
    renderEducationPanel();
    document.dispatchEvent(new CustomEvent("portfolio:rendered"));
  }

  function bindResumeInlineEdit() {
    if (!canEdit()) return;
    document.querySelectorAll("[data-edit-resume-field]").forEach((el) => {
      el.contentEditable = "true";
      el.classList.add("is-editable");
      if (el.dataset.resumeBound) return;
      el.dataset.resumeBound = "1";
      el.addEventListener("blur", () => {
        if (!canEdit()) return;
        const item = PortfolioStore.findResume(el.dataset.resumeId);
        if (item) {
          item[el.dataset.editResumeField] = el.textContent.trim();
          PortfolioStore.notifyChange();
        }
      });
    });
  }

  function renderResumeCard(r) {
    const isEdit = canEdit();
    const typeLabel = { "cover-letter": "자기소개서", resume: "이력서", "career-description": "경력기술서" }[r.type] || "문서";
    const visBadge = isEdit && r.visibility === "private" ? '<span class="resume-card__badge resume-card__badge--private">비공개</span>' : "";
    const status = getWriteStatus(r);
    const pdfLink = r.pdfUrl ? CMS.resolveAssetUrl(r.pdfUrl) : "";
    const excerpt = getExcerpt(r);
    const viewHref = `resume-view.html?slug=${encodeURIComponent(r.slug)}`;
    const writeHref = `${viewHref}&edit=1`;

    return `<article class="resume-card resume-card--${status.cls}" data-resume-id="${r.id}" data-slug="${r.slug}" data-type="${r.type}">
      ${visBadge}
      <div class="resume-card__status resume-card__status--${status.cls}">${status.label}</div>
      <span class="resume-card__type">${typeLabel}</span>
      <h3 ${isEdit ? `data-edit-resume-field="title" data-resume-id="${r.id}"` : ""}>${esc(r.title)}</h3>
      <p ${isEdit ? `data-edit-resume-field="description" data-resume-id="${r.id}"` : ""}>${esc(r.description || "")}</p>
      <blockquote class="resume-card__excerpt">${esc(excerpt)}</blockquote>
      <div class="resume-card__actions">
        <a href="${isEdit ? writeHref : viewHref}" class="text-link resume-card__write">${isEdit ? "✎ 직접 작성" : "열어보기"}</a>
        ${pdfLink ? `<a href="${esc(pdfLink)}" target="_blank" rel="noopener" class="text-link">PDF</a>` : ""}
      </div>
      ${isEdit ? `<div class="resume-card__controls page-controls">
        <button type="button" class="edit-ctrl-btn" data-resume-action="write" title="직접 작성">✎</button>
        <button type="button" class="edit-ctrl-btn" data-resume-action="visibility" title="공개/비공개">🔒</button>
        <button type="button" class="edit-ctrl-btn" data-resume-action="pdf" title="PDF">📄</button>
        <button type="button" class="edit-ctrl-btn" data-resume-action="copy" title="복사">⎘</button>
        <button type="button" class="edit-ctrl-btn" data-resume-action="delete" title="삭제">×</button>
      </div>` : ""}
    </article>`;
  }

  function bindResumeCardControls() {
    document.querySelectorAll(".resume-card .resume-card__controls:not([data-bound])").forEach((controls) => {
      controls.dataset.bound = "1";
      const card = controls.closest(".resume-card");
      controls.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-resume-action]");
        if (!btn) return;
        const id = card.dataset.resumeId;
        const run = () => {
          const items = PortfolioStore.get().resumes.items;
          const idx = items.findIndex((r) => r.id === id);
          if (idx < 0) return;
          if (btn.dataset.resumeAction === "write" || btn.dataset.resumeAction === "edit") {
            CMSPageActions.saveDraftNow();
            window.location.href = `resume-view.html?slug=${encodeURIComponent(items[idx].slug)}&edit=1`;
          } else if (btn.dataset.resumeAction === "pdf") {
            uploadResumePdf(id);
          } else if (btn.dataset.resumeAction === "visibility") {
            items[idx].visibility = items[idx].visibility === "private" ? "public" : "private";
            PortfolioStore.notifyChange();
            renderResumeList();
            EditorUI.showToast(items[idx].visibility === "private" ? "비공개로 설정됨" : "공개로 설정됨", "info");
          } else if (btn.dataset.resumeAction === "copy") {
            const copy = { ...items[idx], id: EditorGitHub.generateId("resume"), slug: `${items[idx].slug}-copy`, title: `${items[idx].title} (복사)`, sections: (items[idx].sections || []).map((s) => ({ ...s, id: EditorGitHub.generateId("s") })) };
            items.splice(idx + 1, 0, copy);
            PortfolioStore.notifyChange();
            renderResumeList();
          } else if (btn.dataset.resumeAction === "delete") {
            EditorUI.confirm("삭제하시겠습니까?").then((ok) => {
              if (!ok) return;
              items.splice(idx, 1);
              PortfolioStore.notifyChange();
              renderResumeList();
            });
          }
        };
        if (btn.dataset.resumeAction === "write" || btn.dataset.resumeAction === "edit") {
          run();
        } else {
          CMSPageActions.runWithEditor(run);
        }
      });
    });
  }

  async function uploadResumePdf(id) {
    const file = await EditorUpload.pick("application/pdf");
    if (!file) return;
    EditorUI.showLoading("PDF 업로드 중...");
    try {
      const path = await CMS.persistUploadedFile(file);
      const item = PortfolioStore.findResume(id);
      if (item) { item.pdfUrl = path; PortfolioStore.notifyChange(); }
      EditorUI.closeModal();
      renderResumeList();
      EditorUI.showToast("PDF 업로드 완료", "success");
    } catch (err) {
      EditorUI.closeModal();
      EditorUI.showToast(err.message, "error");
    }
  }

  function addResume(type, defaultTitle) {
    const title = prompt("제목:", defaultTitle);
    if (!title) return;
    const slug = `${type}-${Date.now().toString(36)}`;
    const defaultSections = type === "cover-letter"
      ? [
        { title: "지원동기", content: "" },
        { title: "프로젝트 경험", content: "" },
        { title: "입사 후 포부", content: "" },
      ]
      : [
        { title: "기본 정보", content: "" },
        { title: "학력", content: "" },
        { title: "경력", content: "" },
        { title: "프로젝트", content: "" },
        { title: "기술 스택", content: "" },
      ];

    const item = {
      id: EditorGitHub.generateId("resume"),
      type,
      title,
      slug,
      description: "",
      pdfUrl: "",
      sections: defaultSections.map((s, i) => ({ ...s, id: EditorGitHub.generateId("s"), order: i })),
      order: PortfolioStore.get().resumes.items.length,
      visibility: "public",
    };
    PortfolioStore.get().resumes.items.push(item);
    PortfolioStore.notifyChange();
    CMSPageActions.stashPendingResume(item);
    CMSPageActions.saveDraftNow();
    CMSPageActions.navigateToResumeEditor(slug);
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  document.addEventListener("portfolio:rendered", () => {
    bindResumeInlineEdit();
    if (canEdit()) renderEducationPanel();
  });

  document.addEventListener("DOMContentLoaded", bootstrap);
  window.renderResumeList = renderResumeList;
  window.bindResumeInlineEdit = bindResumeInlineEdit;
})();
