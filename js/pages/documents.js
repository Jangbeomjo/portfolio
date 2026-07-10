/**
 * Documents 페이지 — 보안·접근 제어 + 파일 관리
 */
(function documentsPage() {
  const BASE = "../";
  const ACCEPT = ".pdf,.png,.jpg,.jpeg,.docx,.hwp,.zip";
  const CATEGORIES = [
    { value: "portfolio", label: "포트폴리오 (공개)" },
    { value: "resume", label: "이력서 (공개)" },
    { value: "cover-letter", label: "자기소개서 (공개)" },
    { value: "graduation", label: "졸업증명서 (비공개)" },
    { value: "certificate", label: "자격증 (비공개)" },
    { value: "transcript", label: "성적증명서 (비공개)" },
    { value: "other", label: "기타" },
  ];

  let accessCtx = null;

  async function bootstrap() {
    try {
      const raw = await DataLoader.loadAllRaw();
      PortfolioStore.init(raw);
      normalizeDocumentsInStore();
      if (EditorAuth?.getSession?.()) {
        await restoreDraftIfAny();
        normalizeDocumentsInStore();
      }
      EditorHistory.reset(PortfolioStore.get());
      accessCtx = DocumentAccess.getContext();
      await handleDeepLinkAccess();
      renderDocuments();
      bindDropzone();
      bindDocumentsActionHub();
      CMSHeader.render();
      CMS.initReveal?.();
      CMS.signalPortfolioReady?.();
      setTimeout(() => CMS.restoreReturnScroll?.(), 80);
    } catch (err) {
      console.error(err);
      const grid = document.getElementById("documentsGrid");
      const fileHint = DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()
        ? "파일 직접 열기 시 <code>js/portfolio-data.js</code> 필요 — <code>python scripts/bundle-data.py</code> 또는 <code>start-server.bat</code>"
        : "<code>start-server.bat</code>으로 localhost에서 다시 시도하세요.";
      if (grid) {
        grid.innerHTML = `<p class="doc-empty-hint">Documents 데이터를 불러오지 못했습니다.<br>${fileHint}</p>`;
      }
      if (DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()) {
        EditorUI?.showToast?.("데이터 번들이 없습니다. bundle-data.py 실행 또는 로컬 서버를 사용하세요.", "error");
      } else {
        EditorUI?.showToast?.("데이터를 불러오지 못했습니다.", "error");
      }
    }
  }

  function normalizeDocumentsInStore() {
    const store = PortfolioStore.get();
    if (!store.documents?.items) store.documents = { items: [], meta: {} };
    store.documents.items = DocumentAccess.normalizeAll(store.documents.items);
  }

  async function restoreDraftIfAny() {
    await CMSPageActions.restoreDraftOnLoad({ restoreIfLoggedIn: true });
  }

  /** 공유 링크로 진입 시 토큰 검증 */
  async function handleDeepLinkAccess() {
    const { shareDocId, shareToken } = accessCtx;
    if (!shareDocId || !shareToken) return;
    const doc = PortfolioStore.findDocument(shareDocId);
    if (!doc) {
      EditorUI.showToast("유효하지 않은 공유 링크입니다.", "error");
      return;
    }
    if (DocumentAccess.isShareValid(doc, accessCtx)) {
      EditorUI.showToast(`「${doc.name}」 공유 링크로 접근했습니다.`, "info");
    } else if (doc.access?.shareExpiresAt && new Date(doc.access.shareExpiresAt) < new Date()) {
      EditorUI.showToast("공유 링크가 만료되었습니다.", "error");
    } else {
      EditorUI.showToast("공유 토큰이 올바르지 않습니다.", "error");
    }
  }

  function renderDocuments() {
    const grid = document.getElementById("documentsGrid");
    const summaryEl = document.getElementById("documentsSummary");
    if (!grid) return;
    accessCtx = DocumentAccess.getContext();
    const isEdit = DocumentAccess.isEditMode();
    const allItems = PortfolioStore.get().documents?.items || [];
    const items = [...allItems]
      .filter((d) => DocumentAccess.canList(d, accessCtx))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const withFile = allItems.filter((d) => DocumentAccess.hasFile(d)).length;
    const withoutFile = allItems.length - withFile;
    if (summaryEl) {
      summaryEl.innerHTML = isEdit
        ? `<span>전체 ${allItems.length}개</span><span class="doc-file-status doc-file-status--ok">파일 있음 ${withFile}</span><span class="doc-file-status doc-file-status--missing">파일 없음 ${withoutFile}</span>`
        : `<span>공개 ${items.length}개</span><span class="doc-file-status doc-file-status--ok">열람 가능 ${items.filter((d) => DocumentAccess.hasFile(d)).length}</span>`;
    }

    if (!items.length) {
      grid.innerHTML = `<p class="doc-empty-hint">「문서 관리」에서 <strong>↑ 파일 업로드</strong> 또는 <strong>+ 빈 문서 추가</strong>로 시작하세요.</p>`;
    } else {
      grid.innerHTML = items.map((d) => renderDocCard(d)).join("");
    }

    bindDocControls();
    bindCardActions();
    document.dispatchEvent(new CustomEvent("portfolio:rendered"));
  }

  function renderDocCard(d) {
    const isEdit = DocumentAccess.isEditMode();
    const canPrev = DocumentAccess.canPreview(d, accessCtx);
    const canOpen = DocumentAccess.canOpen(d, accessCtx);
    const canDown = DocumentAccess.canDownload(d, accessCtx);
    const fileUrl = DocumentAccess.getFileUrl(d);
    const hasFile = DocumentAccess.hasFile(d);
    const size = d.fileSize ? formatSize(d.fileSize) : "";
    const versionCount = (d.versions || []).length;
    const thumb = renderThumbnail(d, canOpen, canPrev, hasFile);
    const fileStatus = isEdit
      ? (hasFile
        ? `<span class="doc-file-status doc-file-status--ok">● 파일 등록됨</span>`
        : `<span class="doc-file-status doc-file-status--missing">○ 파일 없음</span>`)
      : "";

    const metaItems = [
      esc(categoryLabel(d.category)),
      size !== "-" ? size : "",
      `업로드 ${formatDate(d.uploadedAt)}`,
      versionCount ? `v${versionCount + 1}` : "",
    ].filter(Boolean);

    const actionRow = [
      canOpen && fileUrl ? `<button type="button" class="doc-action-btn doc-action-btn--primary" data-doc-user-action="open" data-doc-id="${d.id}">열기</button>` : "",
      canPrev && fileUrl && !isEdit && !canOpen ? `<button type="button" class="doc-action-btn" data-doc-user-action="preview" data-doc-id="${d.id}">미리보기</button>` : "",
      canDown && fileUrl ? `<button type="button" class="doc-action-btn" data-doc-user-action="download" data-doc-id="${d.id}">다운로드</button>` : "",
      d.visibility === "password" && !DocumentAccess.isEditMode() && !accessCtx.unlockedIds.includes(d.id)
        ? `<button type="button" class="doc-action-btn" data-doc-user-action="unlock" data-doc-id="${d.id}">비밀번호</button>` : "",
      isEdit && !hasFile
        ? `<div class="doc-card__upload-prompt">
            <button type="button" class="doc-action-btn doc-action-btn--upload" data-doc-user-action="upload" data-doc-id="${d.id}">↑ 파일 업로드</button>
            <span class="doc-card__upload-hint">파일을 업로드해 주세요</span>
          </div>` : "",
      hasFile && !canOpen && !canPrev && !canDown && !isEdit ? `<span class="doc-card__muted">접근 권한 없음</span>` : "",
    ].filter(Boolean).join("");

    return `<article class="doc-card doc-card--${d.classification}${hasFile ? "" : " doc-card--no-file"}" data-doc-id="${d.id}">
      ${isEdit ? `<div class="doc-card__top">
        ${fileStatus}
        <span class="doc-badge ${DocumentAccess.badgeClass(d)}">${DocumentAccess.visibilityLabel(d)}</span>
        <span class="doc-badge doc-badge--class">${DocumentAccess.classificationLabel(d)}</span>
      </div>` : ""}
      ${thumb}
      <div class="doc-card__body">
        <h3 ${isEdit ? `data-edit-doc-field="name" data-doc-id="${d.id}"` : ""}>${esc(d.name)}</h3>
        <p ${isEdit ? `data-edit-doc-field="description" data-doc-id="${d.id}"` : ""}>${esc(d.description || "")}</p>
        ${isEdit ? `<div class="doc-card__access-tags">
          ${d.access?.allowPreview ? '<span class="doc-tag">미리보기</span>' : '<span class="doc-tag doc-tag--off">미리보기 OFF</span>'}
          ${d.access?.allowDownload ? '<span class="doc-tag">다운로드</span>' : '<span class="doc-tag doc-tag--off">다운로드 OFF</span>'}
          ${d.access?.watermarkOnDownload ? '<span class="doc-tag">워터마크</span>' : ""}
        </div>` : ""}
        <div class="doc-card__meta">${metaItems.map((m) => `<span>${m}</span>`).join("")}</div>
      </div>
      ${actionRow ? `<div class="doc-card__actions">${actionRow}</div>` : ""}
      ${isEdit ? `<div class="doc-card__controls page-controls">
        <button type="button" class="edit-ctrl-btn" data-doc-action="access" title="접근 설정">🔒</button>
        <button type="button" class="edit-ctrl-btn" data-doc-action="share" title="공유 링크">🔗</button>
        <button type="button" class="edit-ctrl-btn" data-doc-action="versions" title="버전">📚</button>
        <button type="button" class="edit-ctrl-btn" data-doc-action="upload" title="업로드">↑</button>
        <button type="button" class="edit-ctrl-btn" data-doc-action="delete" title="삭제">×</button>
      </div>` : ""}
    </article>`;
  }

  /** 카드 썸네일 — 클릭 시 열기 */
  function renderThumbnail(d, canOpen, canPreview, hasFile) {
    const openAttrs = canOpen && hasFile
      ? ` data-doc-user-action="open" data-doc-id="${d.id}" role="button" tabindex="0" aria-label="${esc(d.name)} 열기"`
      : "";
    const clickableClass = canOpen && hasFile ? " doc-card__thumb--clickable" : "";

    if (!hasFile) {
      return `<div class="doc-card__thumb doc-card__thumb--empty"><span>📭</span><small>파일 없음</small></div>`;
    }
    if (!canOpen && !canPreview) {
      return `<div class="doc-card__thumb doc-card__thumb--locked"><span>${fileIcon(d.fileType)}</span><small>잠김</small></div>`;
    }
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(d.fileType)) {
      return `<div class="doc-card__thumb${clickableClass}"${openAttrs}><img src="${esc(DocumentAccess.getFileUrl(d))}" alt="" loading="lazy"></div>`;
    }
    if (d.fileType === "html" || d.fileType === "htm") {
      return `<div class="doc-card__thumb doc-card__thumb--html${clickableClass}"${openAttrs}><span>HTML</span><small>열기 클릭</small></div>`;
    }
    return `<div class="doc-card__thumb doc-card__thumb--pdf${clickableClass}"${openAttrs}><span>PDF</span><small>${canOpen ? "열기 클릭" : "미리보기"}</small></div>`;
  }

  function bindCardActions() {
    document.querySelectorAll("[data-doc-user-action]").forEach((btn) => {
      if (btn.dataset.docActionBound) return;
      btn.dataset.docActionBound = "1";
      btn.onclick = () => handleUserAction(btn.dataset.docUserAction, btn.dataset.docId);
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleUserAction(btn.dataset.docUserAction, btn.dataset.docId);
        }
      });
    });
  }

  function inferDocFileType(doc) {
    const type = (doc.fileType || "").toLowerCase();
    if (type) return type;
    const path = doc.storage?.path || doc.fileUrl || "";
    return path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "pdf";
  }

  async function handleUserAction(action, docId) {
    const doc = PortfolioStore.findDocument(docId);
    if (!doc) return;

    if (action === "unlock") {
      openPasswordModal(doc);
      return;
    }

    if (action === "open") {
      if (!DocumentAccess.canOpen(doc, accessCtx)) {
        EditorUI.showToast("열기 권한이 없습니다.", "error");
        return;
      }
      if (!DocumentAccess.hasFile(doc)) {
        EditorUI.showToast("업로드된 파일이 없습니다. 편집 모드에서 파일을 업로드해 주세요.", "error");
        return;
      }
      const viewable = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "html", "htm"];
      if (viewable.includes(inferDocFileType(doc))) {
        openPreviewModal(doc);
        return;
      }
      try {
        await DocumentAccess.openFile(doc);
      } catch (err) {
        EditorUI.showToast(err.message, "error");
      }
      return;
    }

    if (action === "preview") {
      if (!DocumentAccess.canPreview(doc, accessCtx)) {
        EditorUI.showToast("미리보기 권한이 없습니다.", "error");
        return;
      }
      openPreviewModal(doc);
      return;
    }

    if (action === "download") {
      if (!DocumentAccess.canDownload(doc, accessCtx)) {
        if (!doc.access?.allowDownload) {
          EditorUI.showToast("이 문서는 다운로드가 허용되지 않습니다.", "error");
        } else if (!DocumentAccess.hasDocAccess(doc, accessCtx)) {
          EditorUI.showToast("다운로드 권한이 없습니다. 비밀번호 확인 또는 공유 링크가 필요합니다.", "error");
        } else if (!DocumentAccess.hasFile(doc)) {
          EditorUI.showToast("다운로드할 파일이 없습니다.", "error");
        } else {
          EditorUI.showToast("다운로드할 수 없습니다.", "error");
        }
        return;
      }
      try {
        await DocumentAccess.downloadFile(doc);
      } catch (err) {
        EditorUI.showToast(err.message, "error");
      }
      return;
    }

    if (action === "upload") {
      CMSPageActions.runWithEditor(() => uploadToDocument(docId));
    }
  }

  function openPreviewModal(doc) {
    const urls = DocumentAccess.getFileUrlCandidates?.(doc) || [DocumentAccess.getFileUrl(doc)].filter(Boolean);
    const url = urls[0];
    if (!url) {
      EditorUI.showToast("파일 URL을 찾을 수 없습니다. PDF를 다시 업로드해 주세요.", "error");
      return;
    }

    const fileType = inferDocFileType(doc);
    const isPdf = fileType === "pdf";
    let body = "";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(fileType)) {
      body = `<div class="doc-preview-modal"><img id="docPreviewImg" src="${CMS.esc(url)}" alt="${CMS.esc(doc.name)}"></div>`;
    } else if (isPdf) {
      body = `<div class="doc-preview-modal doc-preview-modal--pdf"><div id="docPreviewPdf" class="doc-pdf-viewer"><p class="doc-preview-loading">문서 불러오는 중...</p></div></div>`;
    } else if (fileType === "html" || fileType === "htm") {
      body = `<div class="doc-preview-modal doc-preview-modal--pdf">
        <iframe id="docPreviewFrame" src="${CMS.esc(url)}" title="${CMS.esc(doc.name)}" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
      </div>`;
    } else {
      body = `<p>이 형식은 브라우저 미리보기를 지원하지 않습니다. <strong>다운로드</strong>를 이용해 주세요.</p>`;
    }

    const foot = isPdf
      ? `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="previewClose">닫기</button>`
      : `<button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="previewOpen">새 탭에서 열기</button>
        <button type="button" class="editor-toolbar__btn editor-toolbar__btn--ghost" id="previewClose">닫기</button>`;

    EditorUI.openModal({ title: doc.name, body, foot });
    document.getElementById("previewClose").onclick = EditorUI.closeModal;

    if (!isPdf) {
      document.getElementById("previewOpen")?.addEventListener("click", async () => {
        try {
          await DocumentAccess.openFile(doc);
        } catch (err) {
          EditorUI.showToast(err.message, "error");
        }
      });
    }

    if (isPdf) {
      requestAnimationFrame(() => {
        const container = document.getElementById("docPreviewPdf");
        renderPdfViewer(container, urls).catch((err) => {
          EditorUI.showToast(err.message || "PDF 미리보기에 실패했습니다.", "error");
          if (container) {
            container.innerHTML = `<p class="doc-empty-hint">${CMS.esc(err.message || "PDF 미리보기에 실패했습니다.")}</p>`;
          }
        });
      });
    }
  }

  const PDFJS_CDN = [
    {
      script: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    },
    {
      script: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
      worker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
    },
  ];

  let pdfJsLoadPromise = null;

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfJsLoadPromise) return pdfJsLoadPromise;

    pdfJsLoadPromise = new Promise((resolve, reject) => {
      let idx = 0;
      const tryNext = () => {
        if (idx >= PDFJS_CDN.length) {
          reject(new Error("PDF 뷰어를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요."));
          return;
        }
        const source = PDFJS_CDN[idx++];
        const script = document.createElement("script");
        script.src = source.script;
        script.onload = () => {
          if (!window.pdfjsLib) {
            tryNext();
            return;
          }
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = source.worker;
          resolve(window.pdfjsLib);
        };
        script.onerror = tryNext;
        document.head.appendChild(script);
      };
      tryNext();
    });

    return pdfJsLoadPromise;
  }

  async function fetchPdfData(urlOrUrls) {
    const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
    let lastErr = null;
    for (const url of urls) {
      if (!url) continue;
      try {
        if (url.startsWith("data:")) {
          const base64 = url.split(",")[1];
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes.buffer;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.arrayBuffer();
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(lastErr?.message || "PDF 파일을 불러오지 못했습니다.");
  }

  function measurePdfScale(container, baseWidth) {
    const modalBox = container?.closest(".editor-modal__box");
    const desktop = window.matchMedia("(min-width: 641px)").matches;
    const maxCap = desktop ? 960 : 900;
    const width = Math.max(
      container?.clientWidth || 0,
      modalBox?.clientWidth ? modalBox.clientWidth - 56 : 0,
      Math.min(window.innerWidth * (desktop ? 0.9 : 0.88), maxCap),
      280,
    );
    return Math.min(Math.max(width / baseWidth, 0.4), desktop ? 1.75 : 1.6);
  }

  /** PDF.js — 1페이지 먼저 표시, 나머지는 스크롤 시 렌더 */
  async function renderPdfViewer(container, urlOrUrls) {
    if (!container) throw new Error("미리보기 영역을 찾지 못했습니다.");

    const pdfjsLib = await loadPdfJs();
    container.innerHTML = `<p class="doc-preview-loading">문서 불러오는 중...</p>`;
    const data = await fetchPdfData(urlOrUrls);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    container.innerHTML = "";
    const status = document.createElement("p");
    status.className = "doc-pdf-status";
    status.textContent = `총 ${pdf.numPages}페이지`;

    const pagesWrap = document.createElement("div");
    pagesWrap.className = "doc-pdf-pages";
    container.appendChild(status);
    container.appendChild(pagesWrap);

    const firstPage = await pdf.getPage(1);
    const scale = measurePdfScale(container, firstPage.getViewport({ scale: 1 }).width);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const slot = document.createElement("div");
      slot.className = "doc-pdf-page-slot";
      slot.dataset.page = String(pageNum);
      slot.innerHTML = `<p class="doc-preview-loading">${pageNum}페이지 준비 중...</p>`;
      pagesWrap.appendChild(slot);
    }

    const rendered = new Set();

    async function renderPage(pageNum) {
      if (rendered.has(pageNum)) return;
      rendered.add(pageNum);
      const slot = pagesWrap.querySelector(`[data-page="${pageNum}"]`);
      if (!slot) return;

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.className = "doc-pdf-page";
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      slot.innerHTML = "";
      slot.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      status.textContent = `${pageNum} / ${pdf.numPages} 페이지`;
    }

    await renderPage(1);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const pageNum = Number(entry.target.dataset.page);
        renderPage(pageNum).catch(() => {});
        observer.unobserve(entry.target);
      });
    }, { root: container, rootMargin: "240px 0px" });

    pagesWrap.querySelectorAll(".doc-pdf-page-slot").forEach((slot, index) => {
      if (index === 0) return;
      observer.observe(slot);
    });
  }

  function openPasswordModal(doc) {
    EditorUI.openModal({
      title: "비밀번호 확인",
      body: `<div class="editor-form"><label>비밀번호<input type="password" id="docUnlockPwd" autocomplete="off"></label></div>`,
      foot: `<button class="editor-toolbar__btn editor-toolbar__btn--ghost" id="pwdCancel">취소</button><button class="editor-toolbar__btn editor-toolbar__btn--primary" id="pwdApply">확인</button>`,
    });
    document.getElementById("pwdCancel").onclick = EditorUI.closeModal;
    document.getElementById("pwdApply").onclick = async () => {
      const pwd = document.getElementById("docUnlockPwd").value;
      const ok = await DocumentAccess.verifyPassword(doc, pwd);
      if (!ok) {
        EditorUI.showToast("비밀번호가 올바르지 않습니다.", "error");
        return;
      }
      DocumentAccess.unlockDoc(doc.id);
      accessCtx = DocumentAccess.getContext();
      EditorUI.closeModal();
      renderDocuments();
      EditorUI.showToast("접근이 허용되었습니다.", "success");
    };
  }

  function bindDocumentsActionHub() {
    document.getElementById("docUploadBtn")?.addEventListener("click", () => {
      CMSPageActions.runWithEditor(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ACCEPT;
        input.multiple = true;
        input.onchange = () => handleFiles([...input.files]);
        input.click();
      });
    });
    document.getElementById("docAddEmptyBtn")?.addEventListener("click", () => {
      CMSPageActions.runWithEditor(() => addEmptyDocument());
    });
  }

  function addEmptyDocument() {
    const name = prompt("문서 이름:", "새 문서");
    if (!name) return;
    const store = PortfolioStore.get();
    const defaults = DocumentAccess.defaultAccessForCategory("other");
    const now = new Date().toISOString();
    store.documents.items.push(DocumentAccess.normalize({
      id: EditorGitHub.generateId("doc"),
      name,
      category: "other",
      classification: defaults.classification,
      storage: { provider: "github", path: "" },
      fileUrl: "",
      fileType: "pdf",
      fileSize: 0,
      description: "",
      uploadedAt: now,
      updatedAt: now,
      visibility: defaults.visibility,
      access: defaults.access,
      versions: [],
      order: store.documents.items.length,
    }));
    PortfolioStore.notifyChange();
    renderDocuments();
    EditorUI.showToast("문서 슬롯이 추가되었습니다. ↑ 로 파일을 업로드하세요.", "success");
  }

  function bindDropzone() {
    const zone = document.getElementById("docDropzone");
    if (!zone) return;
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("is-dragover");
      CMSPageActions.runWithEditor(() => handleFiles([...e.dataTransfer.files]));
    });
    zone.addEventListener("click", () => {
      CMSPageActions.runWithEditor(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ACCEPT;
        input.multiple = true;
        input.onchange = () => handleFiles([...input.files]);
        input.click();
      });
    });
  }

  async function handleFiles(files) {
    const store = PortfolioStore.get();
    let ok = 0;
    for (const file of files) {
      EditorUI.showLoading(`${file.name} 업로드 중...`);
      try {
        const ext = file.name.split(".").pop().toLowerCase();
        const fileUrl = await CMS.persistUploadedFile(file);
        const defaults = DocumentAccess.defaultAccessForCategory("other");
        const now = new Date().toISOString();
        store.documents.items.push(DocumentAccess.normalize({
          id: EditorGitHub.generateId("doc"),
          name: file.name.replace(/\.[^.]+$/, ""),
          category: "other",
          classification: defaults.classification,
          storage: { provider: "github", path: fileUrl },
          fileUrl,
          fileType: ext,
          fileSize: file.size,
          description: "",
          uploadedAt: now,
          updatedAt: now,
          visibility: defaults.visibility,
          access: defaults.access,
          versions: [],
          order: store.documents.items.length,
        }));
        PortfolioStore.notifyChange();
        ok += 1;
      } catch (err) {
        EditorUI.showToast(err.message || "업로드 실패", "error");
      }
    }
    EditorUI.closeModal();
    renderDocuments();
    if (ok > 0) EditorUI.showToast(`업로드 완료 (${ok}개)`, "success");
    else if (files.length) EditorUI.showToast("업로드에 실패했습니다.", "error");
  }

  async function uploadToDocument(docId) {
    const doc = PortfolioStore.findDocument(docId);
    if (!doc) return;
    const file = await EditorUpload.pick(ACCEPT);
    if (!file) return;
    EditorUI.showLoading("업로드 중...");
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const prevUrl = doc.storage?.path || doc.fileUrl;
      const prevSize = doc.fileSize;
      const prevType = doc.fileType;
      const newUrl = await CMS.persistUploadedFile(file);
      if (prevUrl) DocumentAccess.archiveVersion(doc, prevUrl, prevSize, prevType);
      doc.storage = { ...doc.storage, path: newUrl };
      doc.fileUrl = newUrl;
      doc.fileType = ext;
      doc.fileSize = file.size;
      doc.updatedAt = new Date().toISOString();
      if (!doc.name || doc.name === "새 문서") doc.name = file.name.replace(/\.[^.]+$/, "");
      PortfolioStore.notifyChange();
      EditorUI.closeModal();
      renderDocuments();
      EditorUI.showToast(prevUrl ? "파일 교체 완료 (이전 버전 보관됨)" : "파일 업로드 완료", "success");
    } catch (err) {
      EditorUI.closeModal();
      EditorUI.showToast(err.message || "업로드 실패", "error");
    }
  }

  function bindDocControls() {
    document.querySelectorAll("[data-doc-action]").forEach((btn) => {
      if (btn.dataset.docCtrlBound) return;
      btn.dataset.docCtrlBound = "1";
      btn.onclick = () => {
        CMSPageActions.runWithEditor(async () => {
          const id = btn.closest("[data-doc-id]").dataset.docId;
          const items = PortfolioStore.get().documents.items;
          const idx = items.findIndex((d) => d.id === id);
          if (idx < 0) return;
          const doc = items[idx];
          const action = btn.dataset.docAction;
          if (action === "delete") {
            const ok = await EditorUI.confirm("삭제하시겠습니까?");
            if (!ok) return;
            items.splice(idx, 1);
            PortfolioStore.notifyChange();
            renderDocuments();
          } else if (action === "access") {
            openAccessModal(doc);
          } else if (action === "share") {
            openShareModal(doc);
          } else if (action === "versions") {
            openVersionsModal(doc);
          } else if (action === "upload") {
            uploadToDocument(id);
          }
        });
      };
    });

    if (!DocumentAccess.isEditMode()) return;

    document.querySelectorAll("[data-edit-doc-field]").forEach((el) => {
      el.contentEditable = "true";
      el.classList.add("is-editable");
      el.onblur = () => {
        const item = PortfolioStore.findDocument(el.dataset.docId);
        if (item) {
          item[el.dataset.editDocField] = el.textContent.trim();
          item.updatedAt = new Date().toISOString();
          PortfolioStore.notifyChange();
        }
      };
    });
  }

  function openAccessModal(doc) {
    const catOpts = CATEGORIES.map((c) => `<option value="${c.value}"${doc.category === c.value ? " selected" : ""}>${c.label}</option>`).join("");
    EditorUI.openModal({
      title: "접근 권한 설정",
      body: `<div class="editor-form">
        <label>카테고리<select id="docCategory">${catOpts}</select></label>
        <label>공개 상태<select id="docVis">
          <option value="public"${doc.visibility === "public" ? " selected" : ""}>공개</option>
          <option value="private"${doc.visibility === "private" ? " selected" : ""}>비공개 (관리자만)</option>
          <option value="link"${doc.visibility === "link" ? " selected" : ""}>공유 링크</option>
          <option value="password"${doc.visibility === "password" ? " selected" : ""}>비밀번호</option>
        </select></label>
        <label><input type="checkbox" id="docAllowPreview"${doc.access?.allowPreview ? " checked" : ""}> 미리보기 허용</label>
        <label><input type="checkbox" id="docAllowDownload"${doc.access?.allowDownload ? " checked" : ""}> 다운로드 허용 (비관리자)</label>
        <label><input type="checkbox" id="docWatermark"${doc.access?.watermarkOnDownload ? " checked" : ""}> 다운로드 시 워터마크 (이미지)</label>
        <label>비밀번호 (password 모드)<input id="docPassword" type="password" placeholder="변경 시에만 입력"></label>
        <label>설명<textarea id="docDesc" rows="2">${CMS.esc(doc.description || "")}</textarea></label>
      </div>`,
      foot: `<button class="editor-toolbar__btn editor-toolbar__btn--ghost" id="accCancel">취소</button><button class="editor-toolbar__btn editor-toolbar__btn--primary" id="accApply">적용</button>`,
    });
    document.getElementById("accCancel").onclick = EditorUI.closeModal;
    document.getElementById("accApply").onclick = async () => {
      const category = document.getElementById("docCategory").value;
      const defaults = DocumentAccess.defaultAccessForCategory(category);
      const prevToken = doc.access?.shareToken || "";
      const prevExp = doc.access?.shareExpiresAt || "";
      const prevHash = doc.access?.passwordHash || "";
      doc.category = category;
      doc.classification = defaults.classification;
      doc.visibility = document.getElementById("docVis").value;
      doc.access = {
        ...defaults.access,
        shareToken: prevToken,
        shareExpiresAt: prevExp,
        passwordHash: prevHash,
        allowPreview: document.getElementById("docAllowPreview").checked,
        allowDownload: document.getElementById("docAllowDownload").checked,
        watermarkOnDownload: document.getElementById("docWatermark").checked,
      };
      doc.description = document.getElementById("docDesc").value;
      const pwd = document.getElementById("docPassword").value;
      if (pwd) doc.access.passwordHash = await DocumentAccess.hashPassword(pwd);
      doc.updatedAt = new Date().toISOString();
      PortfolioStore.notifyChange();
      EditorUI.closeModal();
      renderDocuments();
      EditorUI.showToast("접근 설정 저장됨", "success");
    };
  }

  function openShareModal(doc) {
    if (!doc.access.shareToken) doc.access.shareToken = DocumentAccess.generateShareToken();
    const link = DocumentAccess.buildShareLink(doc);
    const exp = doc.access.shareExpiresAt ? doc.access.shareExpiresAt.slice(0, 16) : "";
    EditorUI.openModal({
      title: "공유 링크",
      body: `<div class="editor-form">
        <label>공유 URL<input id="shareUrl" readonly value="${CMS.esc(link)}"></label>
        <label>만료일 (선택)<input type="datetime-local" id="shareExp" value="${exp}"></label>
        <p class="form-hint">링크 공유 모드에서만 유효합니다. 만료일이 지나면 접근이 차단됩니다.</p>
      </div>`,
      foot: `<button class="editor-toolbar__btn" id="shareCopy">링크 복사</button><button class="editor-toolbar__btn editor-toolbar__btn--primary" id="shareApply">저장</button>`,
    });
    document.getElementById("shareCopy").onclick = () => {
      navigator.clipboard?.writeText(link);
      EditorUI.showToast("링크가 복사되었습니다.", "success");
    };
    document.getElementById("shareApply").onclick = () => {
      const expVal = document.getElementById("shareExp").value;
      doc.access.shareExpiresAt = expVal ? new Date(expVal).toISOString() : "";
      doc.visibility = doc.visibility === "public" ? "link" : doc.visibility;
      doc.updatedAt = new Date().toISOString();
      PortfolioStore.notifyChange();
      EditorUI.closeModal();
      renderDocuments();
      EditorUI.showToast("공유 설정 저장됨", "success");
    };
  }

  function openVersionsModal(doc) {
    const versions = doc.versions || [];
    const rows = versions.length
      ? versions.map((v, i) => `<li><span>v${versions.length - i}</span> ${formatDate(v.archivedAt || v.uploadedAt)} · ${formatSize(v.fileSize || 0)} <button type="button" class="text-link" data-restore-version="${v.id}">복원</button></li>`).join("")
      : "<li>이전 버전 없음</li>";
    EditorUI.openModal({
      title: `버전 기록 — ${doc.name}`,
      body: `<p class="form-hint">현재: v${versions.length + 1} · ${formatDate(doc.updatedAt)}</p><ul class="doc-version-list">${rows}</ul>`,
      foot: `<button class="editor-toolbar__btn editor-toolbar__btn--ghost" id="verClose">닫기</button>`,
    });
    document.getElementById("verClose").onclick = EditorUI.closeModal;
    document.querySelectorAll("[data-restore-version]").forEach((btn) => {
      btn.onclick = () => {
        const ver = versions.find((v) => v.id === btn.dataset.restoreVersion);
        if (!ver) return;
        DocumentAccess.archiveVersion(doc, doc.fileUrl, doc.fileSize, doc.fileType);
        doc.storage.path = ver.fileUrl;
        doc.fileUrl = ver.fileUrl;
        doc.fileType = ver.fileType;
        doc.fileSize = ver.fileSize;
        doc.updatedAt = new Date().toISOString();
        PortfolioStore.notifyChange();
        EditorUI.closeModal();
        renderDocuments();
        EditorUI.showToast("버전 복원됨", "success");
      };
    });
  }

  function categoryLabel(cat) {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat;
  }

  function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("ko-KR");
  }

  function formatSize(bytes) {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function fileIcon(type) {
    const map = { pdf: "📄", png: "🖼", jpg: "🖼", jpeg: "🖼", docx: "📝", hwp: "📝", zip: "📦" };
    return map[type] || "📎";
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
  window.renderDocuments = renderDocuments;
})();
