/**
 * 인라인 편집기 — Event Delegation 기반 CMS 오케스트레이션
 * DOM 재렌더 후에도 편집 가능 상태 유지
 */
const InlineEditor = (() => {
  let active = false;
  let oauthAborted = false;
  let drawerOpen = false;
  let delegationBound = false;

  function rerenderAllProjects() {
    if (window.rerenderAllProjects) window.rerenderAllProjects();
    else window.renderPortfolio?.(["projects"]);
  }

  function ensureActive() {
    const session = EditorAuth.getSession();
    if (document.body.classList.contains("edit-mode") && session) {
      if (!active) {
        active = true;
        EditorUI.showToolbar();
      }
      return true;
    }
    return active;
  }

  function syncLoggedInViewState() {
    if (!EditorAuth.getSession()) return;
    if (document.body.classList.contains("edit-mode")) {
      ensureActive();
      refreshEditState();
      return;
    }
    active = false;
    EditorUI.hideToolbar?.();
    CMSHeader?.render?.();
  }

  function init() {
    EditorUI.init();
    bindToolbar();
    bindDelegation();
    buildDrawer();
    bindGlobalShortcuts();
    bindDataPipeline();

    document.addEventListener("portfolio:ready", syncLoggedInViewState);

    document.addEventListener("portfolio:rendered", () => {
      if (ensureActive()) refreshEditState();
    });

    if (window.__portfolioReady) syncLoggedInViewState();
  }

  /** cms:data-changed → autosave + history */
  function bindDataPipeline() {
    let historyTimer = null;
    document.addEventListener("cms:data-changed", (e) => {
      if (!active && !EditorAuth?.getSession?.()) return;
      const recordHistory = e.detail?.recordHistory !== false && active;
      if (recordHistory) {
        clearTimeout(historyTimer);
        historyTimer = setTimeout(() => EditorHistory.push(), 400);
      }
      EditorAutosave.schedule(PortfolioStore.exportAll());
    });
  }

  /** Ctrl+Z/Y, Ctrl+S, ESC */
  function bindGlobalShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (!active) return;
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (EditorHistory.undo()) {
          rerenderCurrentPage();
          EditorUI.showToast("실행 취소", "info");
        }
      }
      if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        if (EditorHistory.redo()) {
          rerenderCurrentPage();
          EditorUI.showToast("다시 실행", "info");
        }
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveDraftLocal();
      }
      if (e.key === "Escape") {
        const modal = document.getElementById("editorModal");
        if (modal?.classList.contains("is-open")) EditorUI.closeModal();
      }
    });
  }

  // ─── Event Delegation (1회 등록) ─────────────────────────

  function bindDelegation() {
    if (delegationBound) return;
    delegationBound = true;

    // focus — contact placeholder 제거
    document.addEventListener("focusin", (e) => {
      if (!ensureActive()) return;
      const el = e.target.closest(".contact-link-field[data-edit-field]");
      if (!el?.dataset.placeholder) return;
      if (el.textContent.trim() === el.dataset.placeholder || el.textContent.trim() === "https://...") {
        el.textContent = "";
      }
    });

    // blur — contenteditable → store 동기화
    document.addEventListener("focusout", (e) => {
      if (!ensureActive()) return;
      const el = e.target.closest("[data-edit-field]");
      if (el?.isContentEditable) syncField(el);
    });

    // click — 이미지, 스킬 레벨, 프로젝트 컨트롤, 태그
    document.addEventListener("click", (e) => {
      if (!ensureActive()) return;

      const imgEl = e.target.closest("[data-edit-image]");
      if (imgEl && !e.target.closest(".project-card__controls")) {
        e.stopPropagation();
        e.preventDefault();
        handleImageUpload(imgEl);
        return;
      }

      const triggerImg = e.target.closest("[data-trigger-edit-image]");
      if (triggerImg) {
        e.stopPropagation();
        e.preventDefault();
        const field = triggerImg.dataset.triggerEditImage;
        const target = document.querySelector(`[data-edit-image="${field}"]`);
        if (target) handleImageUpload(target);
        return;
      }

      const levelTrack = e.target.closest("[data-edit-level]");
      if (levelTrack) {
        e.stopPropagation();
        openLevelSlider(levelTrack);
        return;
      }

      const ctrlBtn = e.target.closest(".project-card__controls [data-action]");
      if (ctrlBtn) {
        e.stopPropagation();
        handleProjectAction(ctrlBtn);
        return;
      }

      const addScreenshot = e.target.closest("[data-add-screenshot]");
      if (addScreenshot) { e.stopPropagation(); addProjectScreenshot(addScreenshot.dataset.addScreenshot); return; }

      const projectTagAdd = e.target.closest(".project-tag-add");
      if (projectTagAdd) {
        e.preventDefault();
        e.stopPropagation();
        addProjectTag(projectTagAdd.closest(".project-card"));
        return;
      }

      const tagAdd = e.target.closest(".edit-tag-add");
      if (tagAdd) {
        e.preventDefault();
        addTag(tagAdd.closest(".tech-cloud"));
        return;
      }

      const listAdd = e.target.closest(".edit-add-btn");
      if (listAdd) {
        e.preventDefault();
        listAdd._handler?.();
        return;
      }

      const listBtn = e.target.closest("[data-list-action]");
      if (listBtn) { e.stopPropagation(); CMS.handleListAction(listBtn); return; }

      const lineBtn = e.target.closest("[data-line-action]");
      if (lineBtn) { e.stopPropagation(); CMS.handleLineAction(lineBtn); return; }

      const certUpload = e.target.closest("[data-cert-upload]");
      if (certUpload) { e.stopPropagation(); uploadCertProof(certUpload.dataset.certUpload); return; }
    });

    // dblclick — 태그 삭제
    document.addEventListener("dblclick", (e) => {
      if (!ensureActive()) return;
      const projectTag = e.target.closest(".project-tag");
      if (projectTag) {
        const card = projectTag.closest(".project-card");
        const id = card?.dataset.editId;
        const idx = parseInt(projectTag.dataset.editTagIndex, 10);
        const project = id ? PortfolioStore.findItem("projects", id) : null;
        if (project?.tags && !isNaN(idx)) {
          project.tags.splice(idx, 1);
          PortfolioStore.notifyChange();
          rerenderAllProjects();
        }
        return;
      }
      const tag = e.target.closest(".tech-tag");
      if (!tag) return;
      const idx = parseInt(tag.dataset.editTagIndex, 10);
      if (!isNaN(idx)) {
        PortfolioStore.get().skills.tags.splice(idx, 1);
        window.renderPortfolio(["skills"]);
      }
    });

    // keydown — Enter blur, 태그 편집
    document.addEventListener("keydown", (e) => {
      if (!ensureActive()) return;
      const el = e.target.closest("[data-edit-field]");
      if (el?.isContentEditable && e.key === "Enter" && el.tagName !== "P" && !el.classList.contains("hero-name")) {
        e.preventDefault();
        el.blur();
      }
    });
  }

  /** 렌더 후 contenteditable·클래스만 갱신 (리스너 재등록 불필요) */
  function refreshEditState() {
    document.querySelectorAll("[data-edit-field]").forEach((el) => {
      if (el.matches(".project-card__detail") || el.closest(".hero-links")) return;
      el.classList.add("is-editable");
      el.contentEditable = "true";
    });
    document.querySelectorAll("[data-edit-image]").forEach((el) => el.classList.add("is-editable-image"));
    document.querySelectorAll("[data-edit-level]").forEach((el) => el.classList.add("is-editable-level"));
    document.querySelectorAll(".project-card").forEach((card) => {
      card.style.cursor = "default";
      renderProjectControls(card);
      prepareProjectTags(card);
    });
    document.querySelectorAll(".tech-cloud").forEach(prepareTagCloud);
    CMS.injectGenericControls();
    injectListControls();
    EditorUI.updateHistoryButtons?.();
    window.bindResumeInlineEdit?.();
  }

  /** 편집 모드 진입 — GitHub 로그인 필수 */
  async function enterEditMode() {
    if (!EditorAuth.getSession()) {
      EditorUI.showToast("편집하려면 GitHub 로그인이 필요합니다.", "error");
      return;
    }
    const valid = await EditorAuth.validateSession?.();
    if (!valid) {
      EditorAuth.clearSession();
      EditorUI.showToast("GitHub 세션이 만료되었습니다. 다시 로그인해 주세요.", "error");
      CMSHeader?.render?.();
      return;
    }

    if (EditorAutosave.hasDraft() && EditorAutosave.draftDiffersFrom(PortfolioStore.get())) {
      const restore = await EditorAutosave.promptRestore();
      if (restore) {
        const draft = EditorAutosave.loadDraft();
        if (draft) PortfolioStore.importAll(draft);
      }
    }

    active = true;
    document.body.classList.add("edit-mode");
    EditorUI.showToolbar();
    rerenderCurrentPage();
    refreshEditState();
    EditorUI.updateAutosaveLabel?.(EditorAutosave.getLastSavedAt());
    CMSHeader?.render?.();
  }

  /** 편집 모드 종료 */
  function exitEditMode() {
    active = false;
    document.body.classList.remove("edit-mode");
    EditorUI.hideToolbar();
    document.querySelectorAll("[contenteditable]").forEach((el) => {
      el.contentEditable = "false";
      el.classList.remove("is-editable");
    });
    rerenderCurrentPage();
    CMSHeader?.render?.();
  }

  /** 현재 페이지에 맞는 렌더 함수 호출 */
  function rerenderCurrentPage() {
    if (document.getElementById("projectsPageGrid") && window.renderProjectsPage) {
      window.renderProjectsPage();
      return;
    }
    if (window.renderPortfolio) window.renderPortfolio();
    else if (window.renderProjectsPage) window.renderProjectsPage();
    else if (window.renderResumeDocument) window.renderResumeDocument();
    else if (window.renderResumeList) window.renderResumeList();
    else if (window.renderDocuments) window.renderDocuments();
    else if (window.renderImageLibrary) window.renderImageLibrary();
  }
  function isLikelyUrl(value) {
    const v = String(value || "").trim();
    return /^(https?:\/\/|\.\/|\/|mailto:|tel:)/i.test(v);
  }

  function syncField(el) {
    const field = el.dataset.editField;
    const list = el.closest("[data-edit-list]");
    const value = el.innerText.trim();
    const isPlaceholder = !value
      || value === "https://..."
      || value === el.dataset?.placeholder
      || value === "날짜 (예: 2024.03)"
      || value === "발급기관";
    if (isPlaceholder) {
      if (list && field) {
        const listKey = list.dataset.editList;
        if (listKey === "introLines" || listKey === "resumeLines" || listKey === "heroJourney") {
          PortfolioStore.updateProfileLine(listKey, list.dataset.editId, listKey === "heroJourney" ? field : "text", "");
        } else {
          PortfolioStore.updateItem(listKey, list.dataset.editId, field, "");
        }
      }
      if (field?.startsWith("profile.links.")) {
        const child = field.replace("profile.links.", "");
        PortfolioStore.get().profile.links = PortfolioStore.get().profile.links || {};
        PortfolioStore.get().profile.links[child] = "";
        PortfolioStore.notifyChange();
        window.renderHeroLinks?.(PortfolioStore.get().profile.links);
      }
      return;
    }

    if ((field === "github" || field?.endsWith(".github") || field?.endsWith(".resume")) && !isLikelyUrl(value)) {
      return;
    }

    // introLines / resumeLines — profile 배열
    if (list) {
      const listKey = list.dataset.editList;
      const id = list.dataset.editId;
      if (listKey === "introLines" || listKey === "resumeLines") {
        PortfolioStore.updateProfileLine(listKey, id, "text", value);
        return;
      }
      if (listKey === "heroJourney") {
        PortfolioStore.updateProfileLine(listKey, id, field, value);
        return;
      }
      if (listKey === "skills") {
        const skill = PortfolioStore.findSkill(id);
        if (skill) {
          if (field === "category") {
            openCategoryPicker(skill);
            return;
          }
          skill[field] = value;
        }
        PortfolioStore.notifyChange();
        return;
      }
      if (listKey === "stackLines") {
        PortfolioStore.updateItem("stackLines", id, field, value);
        return;
      }
      if (listKey === "experience" && field === "tech") {
        const item = PortfolioStore.findItem("experience", id);
        if (item) item.tech = value.split(",").map((s) => s.trim()).filter(Boolean);
        PortfolioStore.notifyChange();
        return;
      }
      PortfolioStore.updateItem(listKey, id, field, value);
      if (field === "github") {
        const card = el.closest(".project-card");
        const ghLink = card?.querySelector(".project-card__gh");
        if (ghLink && isLikelyUrl(value)) ghLink.href = value;
      }
      if (listKey === "projects" && field === "href") {
        const card = el.closest(".project-card");
        if (card) card.dataset.href = value;
      }
      return;
    }

    // about.* 레거시 flat 필드 (마이그레이션 전 draft 호환)
    if (field?.startsWith("about.") && !list) {
      const key = field.replace("about.", "");
      PortfolioStore.get().about = PortfolioStore.get().about || {};
      PortfolioStore.get().about[key] = value;
      PortfolioStore.notifyChange();
      return;
    }

    if (field?.startsWith("profile.links.")) {
      const child = field.replace("profile.links.", "");
      const profile = PortfolioStore.get().profile;
      profile.links = profile.links || {};
      profile.links[child] = value;
      PortfolioStore.notifyChange();
      window.renderHeroLinks?.(profile.links);
      return;
    }

    if (field?.startsWith("links.")) {
      const child = field.replace("links.", "");
      const profile = PortfolioStore.get().profile;
      profile.links = profile.links || {};
      profile.links[child] = value;
      PortfolioStore.notifyChange();
      window.renderHeroLinks?.(profile.links);
      return;
    }

    if (field?.startsWith("profile.")) {
      const key = field.replace("profile.", "");
      const profile = PortfolioStore.get().profile;
      if (key.includes(".")) {
        const [parent, child] = key.split(".");
        if (!profile[parent]) profile[parent] = {};
        profile[parent][child] = value;
      } else {
        profile[key] = value;
      }
      if (field === "profile.nameEn") {
        const brand = document.querySelector(".brand");
        if (brand) brand.textContent = value;
      }
      if (field === "profile.role") {
        const eyebrow = document.querySelector(".hero-eyebrow");
        if (eyebrow) eyebrow.textContent = `${value} · Portfolio`;
      }
      PortfolioStore.notifyChange();
    }
  }

  // ─── 프로젝트 컨트롤 ─────────────────────────────────────

  function renderProjectControls(card) {
    const controls = card.querySelector(".project-card__controls");
    if (!controls) return;
    controls.innerHTML = `
      <button type="button" class="edit-ctrl-btn" data-action="featured" title="대표">★</button>
      <button type="button" class="edit-ctrl-btn" data-action="visibility" title="공개">🔒</button>
      <button type="button" class="edit-ctrl-btn" data-action="status" title="상태">◉</button>
      <button type="button" class="edit-ctrl-btn" data-action="hide" title="숨김">👁</button>
      <button type="button" class="edit-ctrl-btn" data-action="copy" title="복사">⎘</button>
      <button type="button" class="edit-ctrl-btn" data-action="up" title="위로">↑</button>
      <button type="button" class="edit-ctrl-btn" data-action="down" title="아래로">↓</button>
      <button type="button" class="edit-ctrl-btn" data-action="delete" title="삭제">×</button>`;
  }

  function handleProjectAction(btn) {
    const card = btn.closest(".project-card");
    const id = card?.dataset.editId;
    const action = btn.dataset.action;
    const items = PortfolioStore.get().projects.items;
    const idx = items.findIndex((p) => p.id === id);
    if (idx < 0) return;

    if (action === "featured") {
      items[idx].featured = !items[idx].featured;
    } else if (action === "visibility") {
      const vis = ["public", "private", "link"];
      const cur = vis.indexOf(items[idx].visibility || "public");
      items[idx].visibility = vis[(cur + 1) % vis.length];
    } else if (action === "status") {
      const st = CMS.PROJECT_STATUS;
      const cur = st.indexOf(items[idx].status || "completed");
      items[idx].status = st[(cur + 1) % st.length];
    } else if (action === "hide") {
      items[idx].hidden = !items[idx].hidden;
    } else if (action === "copy") {
      const copy = { ...items[idx], id: EditorGitHub.generateId("proj"), title: `${items[idx].title} (복사)` };
      items.splice(idx + 1, 0, copy);
      items.forEach((p, i) => { p.order = i; });
    } else if (action === "delete") {
      EditorUI.confirm("이 프로젝트를 삭제하시겠습니까?").then((ok) => {
        if (!ok) return;
        items.splice(idx, 1);
        PortfolioStore.notifyChange();
        rerenderAllProjects();
      });
      return;
    } else if (action === "up" && idx > 0) {
      [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
      items.forEach((p, i) => { p.order = i; });
    } else if (action === "down" && idx < items.length - 1) {
      [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
      items.forEach((p, i) => { p.order = i; });
    } else return;

    PortfolioStore.notifyChange();
    rerenderAllProjects();
  }

  // ─── 태그 클라우드 ─────────────────────────────────────────

  function prepareTagCloud(cloud) {
    cloud.classList.add("is-editable-tags");
    if (!cloud.querySelector(".edit-tag-add")) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "edit-tag-add edit-only";
      addBtn.textContent = "+ 태그";
      cloud.appendChild(addBtn);
    }
    cloud.querySelectorAll(".tech-tag").forEach((tag) => {
      tag.contentEditable = "true";
      tag.title = "클릭하여 수정, 더블클릭하여 삭제";
      if (tag.dataset.tagBound) return;
      tag.dataset.tagBound = "1";
      tag.addEventListener("blur", () => {
        const idx = parseInt(tag.dataset.editTagIndex, 10);
        if (!isNaN(idx)) {
          PortfolioStore.get().skills.tags[idx] = tag.textContent.trim();
          PortfolioStore.notifyChange(false);
        }
      });
    });
  }

  function addTag(cloud) {
    if (!cloud) return;
    const tag = prompt("새 기술 태그:");
    if (tag) {
      PortfolioStore.get().skills.tags.push(tag.trim());
      window.renderPortfolio(["skills"]);
    }
  }

  function prepareProjectTags(card) {
    const container = card.querySelector("[data-edit-tags]");
    if (!container) return;
    container.classList.add("is-editable-tags");
    container.querySelectorAll(".project-tag").forEach((tag) => {
      tag.contentEditable = "true";
      tag.title = "클릭하여 수정, 더블클릭하여 삭제";
      if (tag.dataset.tagBound) return;
      tag.dataset.tagBound = "1";
      tag.addEventListener("blur", () => {
        const id = card.dataset.editId;
        const idx = parseInt(tag.dataset.editTagIndex, 10);
        const project = id ? PortfolioStore.findItem("projects", id) : null;
        if (project?.tags && !isNaN(idx)) {
          project.tags[idx] = tag.textContent.trim();
          PortfolioStore.notifyChange(false);
        }
      });
    });
  }

  function addProjectTag(card) {
    const id = card?.dataset.editId;
    const project = id ? PortfolioStore.findItem("projects", id) : null;
    if (!project) return;
    const tag = prompt("새 태그:");
    if (!tag?.trim()) return;
    project.tags = project.tags || [];
    project.tags.push(tag.trim());
    PortfolioStore.notifyChange();
    rerenderAllProjects();
  }

  // ─── 리스트 추가 버튼 ───────────────────────────────────────

  function injectListControls() {
    injectAddBtn("projectGrid", "프로젝트 추가", addProject);
    injectAddBtn("projectsPageGrid", "프로젝트 추가", addProject);
    injectAddBtn("skillBars", "스킬 추가", addSkill);
    injectAddBtn("eduTimeline", "학력 추가", () => addListItem("education"));
    injectAddBtn("eduCompact", "학력 추가", () => addListItem("education"));
    injectAddBtn("coreStackLines", "스택 추가", addStackLine);
    injectAddBtn("activityGrid", "활동 추가", () => addListItem("experience", "activity"));
    injectAddBtn("careerCompact", "경력 추가", () => addListItem("experience", "career"));
    injectAddBtn("careerTimeline", "경력 추가", () => addListItem("experience", "career"));
    injectAddBtn("trainingGrid", "교육/활동 추가", addTraining);
    injectAddBtn("certList", "자격증 추가", addCertificate);
    injectAddBtn("awardList", "수상 추가", addAward);
    const addIntroLine = () => addProfileLine("introLines");
    injectAddBtn("heroIntroLines", "소개 라인 추가", addIntroLine);
    injectAddBtn("aboutIntroLines", "소개 라인 추가", addIntroLine);
    injectAddBtn("heroJourney", "여정 추가", addHeroJourneyItem);
    injectAddBtn("aboutSections", "About 항목 추가", addAboutSection);
    injectAddBtn("resumeLines", "이력서 라인 추가", () => addProfileLine("resumeLines"));
  }

  function addTraining() {
    PortfolioStore.addItem("training", {
      id: EditorGitHub.generateId("tr"), type: "bootcamp", period: "", title: "새 교육",
      desc: "", organization: "", order: PortfolioStore.get().training.items.length,
    });
    window.renderPortfolio?.(["training"]);
  }

  function addCertificate() {
    PortfolioStore.addItem("certificates", {
      id: EditorGitHub.generateId("cert"), name: "새 자격증", date: "", issuer: "", proofUrl: "",
      order: PortfolioStore.get().certificates.items.length,
    });
    window.renderPortfolio?.(["certificates"]);
  }

  function addAward() {
    PortfolioStore.addItem("awards", {
      id: EditorGitHub.generateId("award"), title: "새 수상", organization: "", date: "",
      description: "", proofUrl: "", order: PortfolioStore.get().awards.items.length,
    });
    window.renderPortfolio?.(["awards"]);
  }

  async function uploadCertProof(id) {
    const file = await EditorUpload.pick("image/*,application/pdf");
    if (!file) return;
    EditorUI.showLoading("업로드 중...");
    const path = file.type === "application/pdf" ? await EditorUpload.uploadPdf(file) : await EditorUpload.uploadImage(file);
    PortfolioStore.updateItem("certificates", id, "proofUrl", path);
    EditorUI.closeModal();
    window.renderPortfolio?.(["certificates"]);
  }

  async function addProjectScreenshot(projectId) {
    const file = await EditorUpload.pick("image/*");
    if (!file) return;
    EditorUI.showLoading("업로드 중...");
    const path = await EditorUpload.uploadImage(file);
    const p = PortfolioStore.findItem("projects", projectId);
    if (p) {
      p.screenshots = p.screenshots || p.images || [];
      p.screenshots.push(path);
      PortfolioStore.notifyChange();
    }
    EditorUI.closeModal();
    rerenderAllProjects?.();
  }

  function openCategoryPicker(skill) {
    const opts = CMS.SKILL_CATEGORIES.map((c) => `<option value="${c}"${skill.category === c ? " selected" : ""}>${c}</option>`).join("");
    EditorUI.openModal({
      title: "카테고리 선택",
      body: `<select id="skillCatPick" class="editor-form">${opts}</select>`,
      foot: `<button class="editor-toolbar__btn editor-toolbar__btn--ghost" id="catCancel">취소</button><button class="editor-toolbar__btn editor-toolbar__btn--primary" id="catApply">적용</button>`,
    });
    document.getElementById("catCancel").onclick = EditorUI.closeModal;
    document.getElementById("catApply").onclick = () => {
      skill.category = document.getElementById("skillCatPick").value;
      PortfolioStore.notifyChange();
      window.renderPortfolio?.(["skills"]);
      EditorUI.closeModal();
    };
  }

  function injectAddBtn(containerId, label, handler) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const host = container.closest(".hero-intro-block, .about-intro-lines") || container.parentElement;
    let btn = host.querySelector(`.edit-add-btn[data-for="${containerId}"]`);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "edit-add-btn edit-only";
      btn.dataset.for = containerId;
      btn.textContent = `+ ${label}`;
      container.insertAdjacentElement("afterend", btn);
    }
    btn._handler = handler;
  }

  function addProject() {
    const id = EditorGitHub.generateId("proj");
    PortfolioStore.addItem("projects", {
      id, title: "새 프로젝트", period: "", type: "", role: "", desc: "",
      tags: [], href: "", github: "", deployUrl: "", youtube: "", thumb: "", thumbnail: "",
      screenshots: [], images: [], pdf: "", videoUrl: "", hidden: false, featured: false,
      visibility: "public", status: "completed", teamSize: "",
      achievements: "", troubleshooting: "", learned: "",
      order: PortfolioStore.get().projects.items.length,
    });
    rerenderAllProjects();
  }

  function addSkill() {
    const id = EditorGitHub.generateId("skill");
    PortfolioStore.get().skills.bars.push({
      id, name: "새 기술", level: 50, stack: "", category: "Backend", icon: "api",
      order: PortfolioStore.get().skills.bars.length,
    });
    PortfolioStore.notifyChange();
    window.renderPortfolio(["skills"]);
  }

  function addStackLine() {
    PortfolioStore.addItem("stackLines", {
      id: EditorGitHub.generateId("cs"),
      label: "분류",
      text: "기술 · 스택",
      order: (PortfolioStore.get().skills.stackLines || []).length,
    });
    window.renderPortfolio?.(["skills", "about"]);
  }

  function addListItem(listKey, category) {
    if (listKey === "education") {
      const id = EditorGitHub.generateId("edu");
      PortfolioStore.addItem("education", {
        id, period: "", school: "학교명", major: "학과", minor: "", title: "학력",
        desc: "", gpa: "", graduated: "", order: PortfolioStore.get().education.items.length,
      });
      window.renderPortfolio?.(["education", "about"]);
      return;
    }
    const id = EditorGitHub.generateId(listKey.slice(0, 4));
    const item = { id, period: "", title: "", desc: "", order: PortfolioStore.get()[listKey].items.length };
    if (listKey === "experience") {
      item.category = category || "activity";
      item.sub = "";
      item.company = "";
      item.role = "";
      item.achievements = "";
      item.tech = [];
      item.activityType = category === "career" ? "" : "external";
      item.organization = "";
    }
    PortfolioStore.addItem(listKey, item);
    const section = category === "career" ? "career" : "activities";
    window.renderPortfolio?.([section, "about"]);
  }

  function addAboutSection() {
    const sections = PortfolioStore.get().profile.about?.sections || [];
    PortfolioStore.addItem("aboutSections", {
      id: EditorGitHub.generateId("as"),
      label: "새 항목",
      text: "",
      order: sections.length,
    });
    window.renderPortfolio?.(["about"]);
  }

  function addProfileLine(arrayKey) {
    const profile = PortfolioStore.get().profile;
    profile[arrayKey] = profile[arrayKey] || [];
    const id = EditorGitHub.generateId(arrayKey === "introLines" ? "il" : "rl");
    profile[arrayKey].push({ id, text: "새 항목", order: profile[arrayKey].length });
    PortfolioStore.notifyChange();
    window.renderPortfolio(["hero", "about", "education"]);
  }

  function addHeroJourneyItem() {
    const profile = PortfolioStore.get().profile;
    profile.heroJourney = profile.heroJourney || [];
    const id = EditorGitHub.generateId("hj");
    profile.heroJourney.push({
      id,
      year: "2026",
      label: "새 여정",
      order: profile.heroJourney.length,
    });
    PortfolioStore.notifyChange();
    window.renderPortfolio(["hero"]);
  }

  // ─── 이미지 / 스킬 슬라이더 ────────────────────────────────

  async function handleImageUpload(el) {
    const field = el.dataset.editImage;
    const list = el.closest("[data-edit-list]");
    const screenshotIndex = el.dataset.screenshotIndex;

    EditorUI.openModal({
      title: "이미지 관리",
      body: `<p style="margin:0;color:var(--muted);font-size:0.85rem">교체하거나 삭제할 수 있습니다.</p>`,
      foot: `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="imgCancel">취소</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="imgDelete">삭제</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--primary" id="imgReplace">교체</button>`,
    });

    document.getElementById("imgCancel").onclick = EditorUI.closeModal;
    document.getElementById("imgDelete").onclick = async () => {
      EditorUI.closeModal();
      const ok = await EditorUI.confirm("이미지를 삭제하시겠습니까?");
      if (!ok) return;
      applyImageDelete(el, field, list, screenshotIndex);
    };
    document.getElementById("imgReplace").onclick = async () => {
      EditorUI.closeModal();
      await replaceImage(el, field, list, screenshotIndex);
    };
  }

  function applyImageDelete(el, field, list, screenshotIndex) {
    if (list && field === "screenshots" && screenshotIndex != null) {
      const id = list.dataset.editId;
      const project = PortfolioStore.findItem("projects", id);
      if (!project) return;
      const shots = project.screenshots || project.images || [];
      const idx = parseInt(screenshotIndex, 10);
      if (idx >= 0 && idx < shots.length) {
        shots.splice(idx, 1);
        project.screenshots = shots;
        if (project.images) project.images = shots;
        PortfolioStore.notifyChange();
        rerenderAllProjects?.();
        EditorUI.showToast("스크린샷이 삭제되었습니다.", "success");
      }
      return;
    }

    if (list && field === "thumbnail") {
      const id = list.dataset.editId;
      PortfolioStore.updateItem("projects", id, "thumbnail", "", { history: false });
      rerenderAllProjects?.();
      EditorUI.showToast("썸네일이 삭제되었습니다.", "success");
      return;
    }

    if (field?.startsWith("profile.")) {
      const key = field.replace("profile.", "");
      PortfolioStore.get().profile[key] = "";
      PortfolioStore.notifyChange(false);
      if (window.renderPortfolio) window.renderPortfolio(["hero", "about", "education", "activities"]);
      CMSHeader?.render?.();
      EditorUI.showToast("이미지가 삭제되었습니다.", "success");
    }
  }

  async function replaceImage(el, field, list, screenshotIndex) {
    try {
      const file = await EditorUpload.pick("image/*");
      if (!file) return;
      EditorUI.showLoading("이미지 업로드 중...");
      const path = await CMS.uploadImageWithFallback(file);

      if (list && field === "screenshots" && screenshotIndex != null) {
        const id = list.dataset.editId;
        const project = PortfolioStore.findItem("projects", id);
        if (project) {
          const shots = project.screenshots || project.images || [];
          const idx = parseInt(screenshotIndex, 10);
          if (idx >= 0 && idx < shots.length) {
            shots[idx] = path;
            project.screenshots = shots;
            if (project.images) project.images = shots;
            PortfolioStore.notifyChange();
            rerenderAllProjects?.();
          }
        }
      } else if (list) {
        const id = list.dataset.editId;
        const listKey = list.dataset.editList;
        PortfolioStore.updateItem(listKey, id, field, path, { history: false });
        if (field === "thumbnail") {
          const preview = CMS.getImagePreviewUrl(path);
          el.style.backgroundImage = `url('${preview.replace(/'/g, "%27")}')`;
          el.className = "project-card__thumb";
        } else {
          rerenderAllProjects?.();
        }
      } else if (field?.startsWith("profile.")) {
        PortfolioStore.get().profile[field.replace("profile.", "")] = path;
        PortfolioStore.notifyChange(false);
        if (window.renderPortfolio) window.renderPortfolio(["hero", "about", "education", "activities"]);
        CMSHeader?.render?.();
      }
      EditorUI.closeModal();
      EditorUI.showToast(
        path.startsWith("data:") ? "Draft에 저장됐습니다." : "이미지가 저장되었습니다.",
        "success"
      );
    } catch (err) {
      EditorUI.closeModal();
      const msg = err?.message || "이미지 저장 실패";
      EditorUI.showToast(/session|credentials|401|bad/i.test(msg)
        ? "GitHub 세션 문제 — 다시 로그인하거나 더 작은 이미지를 사용해 주세요."
        : msg, "error");
    }
  }

  function openLevelSlider(track) {
    const bar = track.closest("[data-edit-list]");
    const id = bar.dataset.editId;
    const skill = PortfolioStore.findSkill(id);
    if (!skill) return;

    EditorUI.openModal({
      title: "숙련도 변경",
      body: `<div class="editor-range-wrap"><input type="range" id="levelSlider" min="0" max="100" value="${skill.level}"><span id="levelVal">${skill.level}%</span></div>`,
      foot: `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="levelCancel">취소</button><button type="button" class="editor-toolbar__btn editor-toolbar__btn--primary" id="levelApply">적용</button>`,
    });
    const slider = document.getElementById("levelSlider");
    const val = document.getElementById("levelVal");
    slider.addEventListener("input", () => { val.textContent = `${slider.value}%`; });
    document.getElementById("levelCancel").onclick = EditorUI.closeModal;
    document.getElementById("levelApply").onclick = () => {
      skill.level = parseInt(slider.value, 10);
      track.dataset.editLevel = skill.level;
      track.querySelector(".skill-bar__fill").style.setProperty("--w", `${skill.level}%`);
      PortfolioStore.notifyChange();
      EditorUI.closeModal();
    };
  }

  // ─── 저장 / Publish / 취소 ─────────────────────────────────

  function bindToolbar() {
    EditorUI.onSave(() => saveDraftLocal());
    EditorUI.onPublish(publishAll);
    EditorUI.onPreview(() => EditorDraft.enterPreview());
    EditorUI.onCancel(cancelEdit);
    EditorUI.onExit(() => {
      exitEditMode();
      CMSHeader?.render?.();
    });
    EditorUI.onLogout(logout);
    EditorUI.onUndo(() => { if (EditorHistory.undo()) rerenderCurrentPage(); });
    EditorUI.onRedo(() => { if (EditorHistory.redo()) rerenderCurrentPage(); });
    EditorUI.onSeo(openSeoPanel);
    EditorUI.onTheme(openThemePanel);
    EditorUI.onGithub(() => GitHubPanel.open());
    EditorUI.onBackup(openBackupPanel);
    EditorUI.onClearDraft(clearDraftWithConfirm);
  }

  /** 로컬 Draft 저장 (Ctrl+S) */
  function saveDraftLocal() {
    EditorAutosave.saveDraft(PortfolioStore.exportAll());
    EditorUI.updateAutosaveLabel?.(EditorAutosave.getLastSavedAt());
    EditorUI.showToast("Draft 저장됨", "success");
  }

  /** GitHub Publish — Diff 확인 후 커밋, 편집 모드 유지 */
  async function publishAll() {
    if (!EditorAuth.getSession()) {
      EditorUI.showToast("Publish하려면 GitHub 로그인이 필요합니다.", "error");
      return;
    }
    EditorDraft.showDiffModal(
      PortfolioStore.getPublished(),
      PortfolioStore.get(),
      async () => {
        EditorUI.showLoading("GitHub에 Publish 중...");
        try {
          await commitToGitHub();
          PortfolioStore.commitSnapshot();
          EditorAutosave.clearDraft();
          EditorHistory.reset(PortfolioStore.get());
          DataLoader.clearCache();
          EditorUI.closeModal();
          EditorUI.showToast("Publish 완료! Vercel 재배포가 시작됩니다.", "success");
          EditorUI.updateAutosaveLabel?.(null);
          // 편집 모드 유지 + 재바인딩
          rerenderCurrentPage();
          refreshEditState();
        } catch (err) {
          EditorUI.closeModal();
          EditorUI.showToast(err.message, "error");
        }
      }
    );
  }

  async function commitToGitHub() {
    const data = PortfolioStore.get();
    PortfolioStore.touchProfile();
    const msg = window._cmsCommitMessage?.() || "CMS: 콘텐츠 Publish";
    ["projects", "skills", "education", "experience", "certificates", "training", "awards", "resumes", "documents", "images"].forEach((k) => PortfolioStore.touchMeta(k));
    data.seo.meta = { updatedAt: new Date().toISOString() };
    data.theme.meta = { updatedAt: new Date().toISOString() };

    const files = [
      { path: "data/profile.json", data: { ...data.profile, about: data.about } },
      { path: "data/projects.json", data: data.projects },
      { path: "data/skills.json", data: data.skills },
      { path: "data/education.json", data: data.education },
      { path: "data/experience.json", data: data.experience },
      { path: "data/certificates.json", data: data.certificates },
      { path: "data/training.json", data: data.training },
      { path: "data/resumes.json", data: data.resumes },
      { path: "data/documents.json", data: data.documents },
      { path: "data/awards.json", data: data.awards },
      { path: "data/images.json", data: data.images },
      { path: "data/seo.json", data: data.seo },
      { path: "data/theme.json", data: data.theme },
    ];
    for (const f of files) {
      await EditorGitHub.saveJson(f.path, f.data, msg);
    }
    const bundle = DataLoader.buildBundleScript(data);
    await EditorGitHub.saveText("js/portfolio-data.js", bundle, msg);
    window.__PORTFOLIO_RAW__ = DataLoader.buildBundleObject(data);
  }

  function cancelEdit() {
    EditorUI.confirm("변경사항을 취소하시겠습니까?").then((ok) => {
      if (!ok) return;
      PortfolioStore.restore();
      EditorAutosave.clearDraft();
      EditorHistory.reset(PortfolioStore.get());
      exitEditMode();
      EditorUI.showToast("변경사항이 취소되었습니다.");
    });
  }

  function clearDraftWithConfirm() {
    EditorUI.confirm("임시 Draft를 삭제하시겠습니까?").then((ok) => {
      if (!ok) return;
      EditorAutosave.clearDraft();
      EditorUI.updateAutosaveLabel?.(null);
      EditorUI.showToast("Draft가 삭제되었습니다.");
    });
  }

  function logout() {
    EditorAuth.clearSession();
    exitEditMode();
    CMSPageActions?.stripEditParamsFromUrl?.();
    if (window.PortfolioRender?.updateHeader) PortfolioRender.updateHeader(PortfolioStore.get().profile);
    CMSHeader?.render?.();
    EditorUI.showToast("로그아웃되었습니다.");
  }

  // ─── OAuth ─────────────────────────────────────────────────

  async function startOAuth() {
    oauthAborted = false;
    try {
      await EditorAuth.loginWithOAuth((phase, data) => {
        if (phase === "waiting" && !oauthAborted) EditorUI.showOAuthModal(data, () => { oauthAborted = true; });
      });
      if (oauthAborted) return;
      EditorUI.closeModal();
      EditorUI.showToast("로그인 성공! 편집 모드를 시작합니다.", "success");
      enterEditMode();
    } catch (err) {
      EditorUI.closeModal();
      EditorUI.showToast(err?.message || "로그인에 실패했습니다.", "error");
    }
  }

  // ─── SEO / Theme / Backup 패널 ─────────────────────────────

  function openSeoPanel() {
    const seo = PortfolioStore.get().seo;
    EditorUI.openModal({
      title: "SEO 설정",
      body: `<div class="editor-form">
        <label>사이트 제목<input id="seoTitle" value="${esc(seo.title)}"></label>
        <label>Description<textarea id="seoDesc" rows="2">${esc(seo.description)}</textarea></label>
        <label>Keywords<input id="seoKw" value="${esc(seo.keywords)}"></label>
        <label>OG Image URL<input id="seoOg" value="${esc(seo.ogImage)}"></label>
      </div>`,
      foot: `<button class="editor-toolbar__btn editor-toolbar__btn--ghost" id="seoCancel">취소</button><button class="editor-toolbar__btn editor-toolbar__btn--primary" id="seoApply">적용</button>`,
    });
    document.getElementById("seoCancel").onclick = EditorUI.closeModal;
    document.getElementById("seoApply").onclick = () => {
      seo.title = document.getElementById("seoTitle").value;
      seo.description = document.getElementById("seoDesc").value;
      seo.keywords = document.getElementById("seoKw").value;
      seo.ogImage = document.getElementById("seoOg").value;
      PortfolioStore.notifyChange();
      applySeo(seo, PortfolioStore.get().profile);
      EditorUI.closeModal();
      EditorUI.showToast("SEO 설정 적용됨. Publish로 반영하세요.");
    };
  }

  function openThemePanel() {
    const theme = PortfolioStore.get().theme;
    const c = theme.colors || {};
    const f = theme.fonts || {};
    const layout = { containerMax: 1100, sectionPad: 0, portraitW: 280, portraitSm: 220, baseFontSize: 16, titleScale: 1, ...(theme.layout || {}) };
    const presetOptions = Object.entries(window.THEME_PRESETS || {}).map(([key, p]) =>
      `<option value="${key}"${theme.preset === key ? " selected" : ""}>${CMS.esc(p.label)} — ${CMS.esc(p.desc)}</option>`
    ).join("");
    EditorUI.openModal({
      title: "테마 설정",
      body: `<div class="editor-form">
        <label>프리셋<select id="themePreset">${presetOptions}</select></label>
        <label>모드<select id="themeMode">
          <option value="dark"${theme.mode === "dark" ? " selected" : ""}>Dark</option>
          <option value="light"${theme.mode === "light" ? " selected" : ""}>Light</option>
          <option value="auto"${theme.mode === "auto" ? " selected" : ""}>Auto</option>
        </select></label>
        <label>Serif 폰트<input id="themeSerif" value="${esc(f.serif || "Playfair Display")}"></label>
        <label>Sans 폰트<input id="themeSans" value="${esc(f.sans || "Noto Sans KR")}"></label>
        <label>메인 색상<input type="color" id="themePrimary" value="${c.primary || "#7a1f1f"}"></label>
        <label>배경색<input type="color" id="themeBg" value="${c.background || "#050505"}"></label>
        <label>Glassmorphism<input type="checkbox" id="themeGlass"${theme.glassmorphism ? " checked" : ""}></label>
        <label>애니메이션<select id="themeAnim">
          <option value="true"${theme.animations !== false ? " selected" : ""}>ON</option>
          <option value="false"${theme.animations === false ? " selected" : ""}>OFF</option>
        </select></label>
        <p class="editor-form__section">레이아웃 · 글자 크기</p>
        <label>컨테이너 너비 (px)
          <div class="editor-range-wrap">
            <input type="range" id="themeContainerMax" min="900" max="1400" step="10" value="${layout.containerMax}">
            <span id="themeContainerMaxVal">${layout.containerMax}</span>
          </div>
        </label>
        <label>섹션 상하 여백 (rem, 0=자동)
          <div class="editor-range-wrap">
            <input type="range" id="themeSectionPad" min="0" max="8" step="0.25" value="${layout.sectionPad}">
            <span id="themeSectionPadVal">${layout.sectionPad || "auto"}</span>
          </div>
        </label>
        <label>프로필 사진 너비 (px)
          <div class="editor-range-wrap">
            <input type="range" id="themePortraitW" min="160" max="400" step="10" value="${layout.portraitW}">
            <span id="themePortraitWVal">${layout.portraitW}</span>
          </div>
        </label>
        <label>기본 글자 크기 (px)
          <div class="editor-range-wrap">
            <input type="range" id="themeBaseFont" min="14" max="18" step="1" value="${layout.baseFontSize}">
            <span id="themeBaseFontVal">${layout.baseFontSize}</span>
          </div>
        </label>
        <label>제목 크기 배율
          <div class="editor-range-wrap">
            <input type="range" id="themeTitleScale" min="85" max="115" step="1" value="${Math.round((layout.titleScale || 1) * 100)}">
            <span id="themeTitleScaleVal">${Math.round((layout.titleScale || 1) * 100)}%</span>
          </div>
        </label>
      </div>`,
      foot: `<button class="editor-toolbar__btn editor-toolbar__btn--ghost" id="themeCancel">취소</button><button class="editor-toolbar__btn editor-toolbar__btn--primary" id="themeApply">적용</button>`,
    });
    const bindRange = (id, valId, fmt = (v) => v) => {
      const input = document.getElementById(id);
      const out = document.getElementById(valId);
      if (!input || !out) return;
      input.oninput = () => { out.textContent = fmt(input.value); };
    };
    bindRange("themeContainerMax", "themeContainerMaxVal");
    bindRange("themeSectionPad", "themeSectionPadVal", (v) => (Number(v) > 0 ? v : "auto"));
    bindRange("themePortraitW", "themePortraitWVal");
    bindRange("themeBaseFont", "themeBaseFontVal");
    bindRange("themeTitleScale", "themeTitleScaleVal", (v) => `${v}%`);
    document.getElementById("themePreset").onchange = (e) => {
      const keepGlass = document.getElementById("themeGlass")?.checked;
      const preset = applyPreset(e.target.value);
      if (preset) {
        Object.assign(theme, preset);
        if (keepGlass !== undefined) theme.glassmorphism = keepGlass;
        applyTheme(theme);
      }
    };
    document.getElementById("themeCancel").onclick = EditorUI.closeModal;
    document.getElementById("themeApply").onclick = () => {
      theme.mode = document.getElementById("themeMode").value;
      theme.preset = document.getElementById("themePreset").value;
      theme.glassmorphism = document.getElementById("themeGlass").checked;
      theme.colors = theme.colors || {};
      theme.colors.primary = document.getElementById("themePrimary").value;
      theme.colors.background = document.getElementById("themeBg").value;
      theme.fonts = { serif: document.getElementById("themeSerif").value, sans: document.getElementById("themeSans").value, signature: f.signature || "Cormorant Garamond" };
      theme.animations = document.getElementById("themeAnim").value === "true";
      theme.layout = {
        containerMax: Number(document.getElementById("themeContainerMax").value),
        sectionPad: Number(document.getElementById("themeSectionPad").value),
        portraitW: Number(document.getElementById("themePortraitW").value),
        portraitSm: layout.portraitSm || 220,
        baseFontSize: Number(document.getElementById("themeBaseFont").value),
        titleScale: Number(document.getElementById("themeTitleScale").value) / 100,
      };
      PortfolioStore.notifyChange();
      applyTheme(theme);
      EditorUI.closeModal();
      EditorUI.showToast("테마 적용됨. Publish로 반영하세요.");
    };
  }

  function openBackupPanel() {
    EditorUI.openModal({
      title: "백업 / 복원",
      body: `<div class="editor-form">
        <p>JSON Export / Import · 3초마다 자동 Draft 백업 (localStorage)</p>
        <button type="button" class="editor-toolbar__btn" id="backupExport">JSON Export</button>
        <button type="button" class="editor-toolbar__btn" id="backupAutoBtn">지금 자동 백업</button>
        <label style="margin-top:1rem">JSON Import<textarea id="backupImport" rows="6" placeholder="JSON 붙여넣기"></textarea></label>
      </div>`,
      foot: `<button class="editor-toolbar__btn editor-toolbar__btn--ghost" id="backupCancel">닫기</button><button class="editor-toolbar__btn editor-toolbar__btn--primary" id="backupApply">Import 적용</button>`,
    });
    document.getElementById("backupCancel").onclick = EditorUI.closeModal;
    document.getElementById("backupExport").onclick = () => {
      const json = JSON.stringify(PortfolioStore.exportAll(), null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `portfolio-backup-${Date.now()}.json`;
      a.click();
      EditorUI.showToast("JSON 파일이 다운로드되었습니다.");
    };
    document.getElementById("backupAutoBtn").onclick = () => {
      EditorAutosave.saveDraft(PortfolioStore.exportAll());
      EditorUI.showToast("자동 백업 완료 (localStorage)", "success");
    };
    document.getElementById("backupApply").onclick = () => {
      try {
        const raw = JSON.parse(document.getElementById("backupImport").value);
        PortfolioStore.importAll(raw);
        rerenderCurrentPage();
        refreshEditState();
        EditorUI.closeModal();
        EditorUI.showToast("Import 완료");
      } catch {
        EditorUI.showToast("유효하지 않은 JSON입니다.", "error");
      }
    };
  }

  // ─── Drawer (간소화 유지) ──────────────────────────────────

  function buildDrawer() {
    const drawer = document.getElementById("editorDrawer");
    if (!drawer || drawer.dataset.ready === "true") return;
    drawer.dataset.ready = "true";
  }

  function esc(s) { return (s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

  return {
    init, startOAuth, enterEditMode, exitEditMode,
    refreshEditState, rerenderCurrentPage, addProject,
    openEditorDrawer: () => {}, closeEditorDrawer: () => {},
  };
})();

window.InlineEditor = InlineEditor;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => InlineEditor.init());
} else {
  InlineEditor.init();
}
