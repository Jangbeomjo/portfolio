/**
 * Image Library — 이미지 업로드/관리 CMS
 */
(function imageLibraryPage() {
  function canEdit() {
    return document.body.classList.contains("edit-mode") && !!EditorAuth?.getSession?.();
  }

  function getAllImages() {
    const lib = CMS.sortByOrder(PortfolioStore.get().images?.items || []);
    const used = CMS.collectUsedImages?.() || [];
    const urls = new Set(lib.map((i) => i.url));
    const merged = [...lib];
    used.forEach((img) => {
      if (!urls.has(img.url)) merged.push(img);
    });
    return merged;
  }

  async function bootstrap() {
    try {
      const raw = await DataLoader.loadAllRaw();
      PortfolioStore.init(raw);
      if (EditorAuth?.getSession?.() && EditorAutosave.hasDraft()) {
        const restore = await EditorAutosave.promptRestore();
        if (restore) {
          const draft = EditorAutosave.loadDraft();
          if (draft) PortfolioStore.importAll(draft);
        }
      }
      EditorHistory.reset(PortfolioStore.get());
      renderImageLibrary();
      bindDropzone();
      CMSHeader.render();
      CMS.initReveal?.();
      CMS.signalPortfolioReady?.();
      setTimeout(() => CMS.restoreReturnScroll?.(), 80);
    } catch (err) {
      console.error(err);
      const grid = document.getElementById("imageGrid");
      const hint = DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()
        ? "<code>python scripts/bundle-data.py</code> 실행 또는 <code>start-server.bat</code> 사용"
        : "<code>start-server.bat</code>으로 localhost에서 다시 시도하세요.";
      if (grid) grid.innerHTML = `<p class="doc-empty-hint">이미지 데이터를 불러오지 못했습니다.<br>${hint}</p>`;
      EditorUI?.showToast?.("이미지 데이터를 불러오지 못했습니다.", "error");
    }
  }

  function renderImageLibrary() {
    const grid = document.getElementById("imageGrid");
    if (!grid) return;
    const isEdit = canEdit();
    const items = getAllImages();

    if (!items.length) {
      grid.innerHTML = isEdit
        ? `<p class="doc-empty-hint">위 영역에 이미지를 드래그하거나 클릭하여 업로드하세요.<br>Home 프로필·프로젝트 썸네일도 편집 모드에서 클릭해 변경할 수 있습니다.</p>`
        : `<p class="doc-empty-hint">등록된 이미지가 없습니다.</p>`;
      return;
    }

    grid.innerHTML = items.map((img) => {
      const isLibItem = !img.sourceKey && PortfolioStore.get().images.items.some((i) => i.id === img.id);
      const tag = img.sourceKey
        ? `<span class="image-card__tag">사용 중</span>`
        : `<span class="image-card__tag image-card__tag--lib">라이브러리</span>`;
      return `
      <article class="image-card${img.featured ? " is-featured" : ""}" data-image-id="${img.id}" data-source-key="${CMS.esc(img.sourceKey || "")}" draggable="${isEdit && isLibItem}">
        ${tag}
        <div class="image-card__thumb" data-img-thumb="${img.id}" data-source-key="${CMS.esc(img.sourceKey || "")}">
          <img src="${CMS.esc(CMS.getImagePreviewUrl(img.url))}" alt="${CMS.esc(img.alt || img.name)}">
        </div>
        <div class="image-card__info">
          <h4 ${isEdit && isLibItem ? `data-edit-img-field="name" data-image-id="${img.id}"` : ""}>${CMS.esc(img.name)}</h4>
          <span ${isEdit && isLibItem ? `data-edit-img-field="category" data-image-id="${img.id}"` : ""}>${CMS.esc(img.category)}</span>
          <small>${img.uploadedAt ? new Date(img.uploadedAt).toLocaleDateString("ko-KR") : (img.sourceKey ? "포트폴리오에서 사용" : "")}</small>
        </div>
        ${isEdit ? `<div class="image-card__controls page-controls">
          ${isLibItem ? `<button type="button" class="edit-ctrl-btn" data-img-action="featured" data-image-id="${img.id}" title="대표">★</button>` : ""}
          <button type="button" class="edit-ctrl-btn" data-img-action="replace" data-image-id="${img.id}" data-source-key="${CMS.esc(img.sourceKey || "")}" title="교체">↻</button>
          <button type="button" class="edit-ctrl-btn" data-img-action="delete" data-image-id="${img.id}" data-source-key="${CMS.esc(img.sourceKey || "")}" title="삭제">×</button>
        </div>` : ""}
      </article>`;
    }).join("");
    bindImageEdit();
    document.dispatchEvent(new CustomEvent("portfolio:rendered"));
  }

  function bindDropzone() {
    const zone = document.getElementById("imageDropzone");
    if (!zone) return;
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("is-dragover");
      CMSPageActions.runWithEditor(() => uploadFiles([...e.dataTransfer.files]));
    });
    zone.addEventListener("click", () => {
      CMSPageActions.runWithEditor(async () => {
        const files = await EditorUpload.pickMultiple("image/*");
        if (files.length) uploadFiles(files);
      });
    });
  }

  async function uploadFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      EditorUI.showLoading(`${file.name} 업로드 중...`);
      const path = await CMS.uploadImageWithFallback(file);
      PortfolioStore.get().images.items.push({
        id: EditorGitHub.generateId("img"),
        name: file.name.replace(/\.[^.]+$/, ""),
        url: path,
        alt: file.name,
        category: "other",
        featured: false,
        uploadedAt: new Date().toISOString(),
        order: PortfolioStore.get().images.items.length,
      });
      PortfolioStore.notifyChange();
    }
    EditorUI.closeModal();
    renderImageLibrary();
    EditorUI.showToast("이미지 업로드 완료", "success");
  }

  async function replaceImage(id, sourceKey) {
    try {
      const file = await EditorUpload.pick("image/*");
      if (!file) return;
      EditorUI.showLoading("저장 중...");
      const path = await CMS.uploadImageWithFallback(file);
      const isLocal = path.startsWith("data:");
      if (sourceKey) {
        CMS.applyImageSource(sourceKey, path);
      } else {
        const items = PortfolioStore.get().images.items;
        const idx = items.findIndex((i) => i.id === id);
        if (idx >= 0) {
          items[idx].url = path;
          items[idx].uploadedAt = new Date().toISOString();
          PortfolioStore.notifyChange();
        }
      }
      EditorUI.closeModal();
      renderImageLibrary();
      EditorUI.showToast(
        isLocal ? "Draft에 저장됐습니다. Publish 시 GitHub 로그인이 필요합니다." : "이미지가 저장되었습니다.",
        isLocal ? "info" : "success"
      );
    } catch (err) {
      EditorUI.closeModal();
      EditorUI.showToast(err?.message || "이미지 저장 실패", "error");
    }
  }

  async function deleteImage(id, sourceKey) {
    const ok = await EditorUI.confirm("이미지를 삭제하시겠습니까?");
    if (!ok) return;
    if (sourceKey) {
      CMS.clearImageSource(sourceKey);
    } else {
      const items = PortfolioStore.get().images.items;
      const idx = items.findIndex((i) => i.id === id);
      if (idx >= 0) {
        items.splice(idx, 1);
        PortfolioStore.notifyChange();
      }
    }
    renderImageLibrary();
    EditorUI.showToast("이미지가 삭제되었습니다.", "success");
  }

  function openImageMenu(id, sourceKey) {
    EditorUI.openModal({
      title: "이미지 관리",
      body: `<p style="margin:0;color:var(--muted);font-size:0.85rem">교체하거나 삭제할 수 있습니다.</p>`,
      foot: `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="libImgCancel">취소</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="libImgDelete">삭제</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--primary" id="libImgReplace">교체</button>`,
    });
    document.getElementById("libImgCancel").onclick = EditorUI.closeModal;
    document.getElementById("libImgDelete").onclick = () => { EditorUI.closeModal(); deleteImage(id, sourceKey); };
    document.getElementById("libImgReplace").onclick = () => { EditorUI.closeModal(); replaceImage(id, sourceKey); };
  }

  function bindImageEdit() {
    if (!canEdit()) return;
    document.querySelectorAll("[data-edit-img-field]").forEach((el) => {
      el.contentEditable = "true";
      el.classList.add("is-editable");
      el.onblur = () => {
        const item = PortfolioStore.get().images.items.find((i) => i.id === el.dataset.imageId);
        if (item) { item[el.dataset.editImgField] = el.textContent.trim(); PortfolioStore.notifyChange(); }
      };
    });
    document.querySelectorAll("[data-img-thumb]").forEach((wrap) => {
      if (wrap.dataset.thumbBound) return;
      wrap.dataset.thumbBound = "1";
      wrap.classList.add("is-editable-image");
      wrap.style.cursor = "pointer";
      wrap.onclick = () => {
        const id = wrap.dataset.imgThumb;
        const sourceKey = wrap.dataset.sourceKey || "";
        openImageMenu(id, sourceKey);
      };
    });
    document.querySelectorAll("[data-img-action]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.imageId;
        const sourceKey = btn.dataset.sourceKey || "";
        if (btn.dataset.imgAction === "delete") {
          deleteImage(id, sourceKey);
        } else if (btn.dataset.imgAction === "featured") {
          const items = PortfolioStore.get().images.items;
          const idx = items.findIndex((i) => i.id === id);
          if (idx < 0) return;
          items.forEach((i) => { i.featured = false; });
          items[idx].featured = true;
          PortfolioStore.notifyChange();
          renderImageLibrary();
        } else if (btn.dataset.imgAction === "replace") {
          replaceImage(id, sourceKey);
        }
      };
    });
  }

  document.addEventListener("portfolio:rendered", bindImageEdit);
  document.addEventListener("DOMContentLoaded", bootstrap);
  window.renderImageLibrary = renderImageLibrary;
})();
