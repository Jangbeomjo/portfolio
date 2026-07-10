/**
 * Documents 접근 제어 — 정적 CMS용 ACL (향후 Supabase/S3 storage.provider 확장)
 */
const DocumentAccess = (() => {
  const UNLOCK_KEY = "portfolio_doc_unlocks";
  const PUBLIC_CATEGORIES = new Set(["portfolio", "resume", "cover-letter", "public"]);
  const PRIVATE_CATEGORIES = new Set(["graduation", "certificate", "transcript", "license", "private"]);

  const VIS_LABELS = {
    public: "공개",
    private: "비공개",
    link: "링크 공유",
    password: "비밀번호",
  };

  const CLASS_LABELS = { public: "공개 문서", private: "비공개 문서" };

  function isAdmin() {
    return !!EditorAuth?.getSession?.()?.canEdit;
  }

  function isEditMode() {
    return document.body.classList.contains("edit-mode") && isAdmin();
  }

  /** URL·세션 기반 접근 컨텍스트 */
  function getContext() {
    const params = new URLSearchParams(location.search);
    return {
      shareDocId: params.get("access") || "",
      shareToken: params.get("token") || "",
      unlockedIds: readUnlocks(),
    };
  }

  function readUnlocks() {
    try {
      return JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function unlockDoc(docId) {
    const ids = new Set(readUnlocks());
    ids.add(docId);
    sessionStorage.setItem(UNLOCK_KEY, JSON.stringify([...ids]));
  }

  /** 문서 스키마 정규화 (storage 추상화 + access + versions) */
  function normalize(doc) {
    if (!doc) return doc;
    const category = doc.category || "other";
    const classification = doc.classification
      || (PRIVATE_CATEGORIES.has(category) ? "private" : PUBLIC_CATEGORIES.has(category) ? "public" : "private");

    const path = doc.storage?.path || doc.fileUrl || "";
    const safePath = isDocumentAsset(path) ? path : "";
    const extFromPath = safePath.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
    const storage = {
      provider: doc.storage?.provider || "github",
      path: safePath,
      bucket: doc.storage?.bucket || "",
      key: doc.storage?.key || "",
      region: doc.storage?.region || "",
    };

    const access = {
      allowPreview: doc.access?.allowPreview ?? doc.allowPreview ?? true,
      allowDownload: doc.access?.allowDownload ?? doc.allowDownload ?? (classification === "public"),
      watermarkOnDownload: doc.access?.watermarkOnDownload ?? doc.watermarkOnDownload ?? false,
      shareToken: doc.access?.shareToken || doc.shareToken || "",
      shareExpiresAt: doc.access?.shareExpiresAt || doc.shareExpiresAt || "",
      passwordHash: doc.access?.passwordHash || doc.passwordHash || "",
    };

    if (doc.password && !access.passwordHash) {
      access._legacyPassword = doc.password;
    }

    const visibility = doc.visibility || (classification === "public" ? "public" : "private");
    const now = new Date().toISOString();

    return {
      ...doc,
      category,
      classification,
      storage,
      fileUrl: safePath,
      fileType: doc.fileType || extFromPath || "pdf",
      access,
      visibility,
      versions: Array.isArray(doc.versions) ? doc.versions : [],
      uploadedAt: doc.uploadedAt || now,
      updatedAt: doc.updatedAt || doc.uploadedAt || now,
      password: undefined,
    };
  }

  function normalizeAll(items) {
    return (items || []).map(normalize);
  }

  function getFileUrl(doc) {
    const urls = getFileUrlCandidates(doc);
    return urls[0] || "";
  }

  /** Draft 캐시 → resolve → 로컬 → GitHub raw 순으로 시도 */
  function getFileUrlCandidates(doc) {
    if (!doc) return [];
    const path = doc.storage?.path || doc.fileUrl || "";
    if (!isDocumentAsset(path)) return [];
    const urls = [];
    const add = (url) => {
      if (url && !urls.includes(url)) urls.push(url);
    };

    if (/^(https?:|blob:|data:)/.test(path)) {
      add(path);
      return urls;
    }

    add(CMS.getImagePreviewUrl?.(path));
    add(CMS.resolveAssetUrl?.(path));
    const clean = path.replace(/^\.\//, "");
    add(CMS.localAssetUrl?.(path));
    add(CMS.githubRawUrl?.(clean));
    return urls;
  }

  /** 사이트 내부 HTML 페이지는 문서 파일로 취급하지 않음 */
  function isDocumentAsset(path) {
    if (!path || typeof path !== "string") return false;
    const trimmed = path.trim();
    if (!trimmed) return false;
    if (/^(https?:|blob:|data:)/.test(trimmed)) return true;
    const clean = trimmed.replace(/^\.\//, "").toLowerCase();
    if (/^pages\/.*\.(html|htm)$/.test(clean)) return false;
    if (clean === "index.html") return false;
    return true;
  }

  function hasFile(doc) {
    const path = doc?.storage?.path || doc?.fileUrl || "";
    return isDocumentAsset(path);
  }

  function isShareValid(doc, ctx) {
    if (!doc?.access?.shareToken) return false;
    if (ctx.shareDocId !== doc.id || ctx.shareToken !== doc.access.shareToken) return false;
    if (doc.access.shareExpiresAt && new Date(doc.access.shareExpiresAt) < new Date()) return false;
    return true;
  }

  function isPasswordUnlocked(doc, ctx) {
    return ctx.unlockedIds.includes(doc.id);
  }

  function hasDocAccess(doc, ctx = getContext()) {
    if (!doc) return false;
    if (isEditMode() || isAdmin()) return true;
    if (doc.visibility === "public") return true;
    if (doc.visibility === "private") return false;
    if (doc.visibility === "link") return isShareValid(doc, ctx);
    if (doc.visibility === "password") return isPasswordUnlocked(doc, ctx);
    return false;
  }

  function canPreview(doc, ctx = getContext()) {
    if (!hasDocAccess(doc, ctx)) return false;
    if (!doc.access?.allowPreview) return isEditMode();
    return !!getFileUrl(doc);
  }

  function canOpen(doc, ctx = getContext()) {
    if (!hasDocAccess(doc, ctx)) return false;
    if (!hasFile(doc)) return false;
    if (isEditMode()) return true;
    return !!doc.access?.allowPreview;
  }

  function canDownload(doc, ctx = getContext()) {
    if (!hasDocAccess(doc, ctx)) return false;
    if (!hasFile(doc)) return false;
    if (isEditMode()) return true;
    if (!doc.access?.allowDownload) return false;
    return true;
  }

  function canList(doc, ctx = getContext()) {
    if (isEditMode() || isAdmin()) return true;
    if (!hasFile(doc)) return false;
    if (doc.visibility === "public" && (doc.access?.allowPreview || doc.access?.allowDownload)) return true;
    if (doc.visibility === "link" && isShareValid(doc, ctx)) return true;
    if (doc.visibility === "password") return true;
    return false;
  }

  function visibilityLabel(doc) {
    return VIS_LABELS[doc.visibility] || doc.visibility;
  }

  function classificationLabel(doc) {
    return CLASS_LABELS[doc.classification] || doc.classification;
  }

  function badgeClass(doc) {
    const map = { public: "doc-badge--public", private: "doc-badge--private", link: "doc-badge--link", password: "doc-badge--password" };
    return map[doc.visibility] || "doc-badge--private";
  }

  async function hashPassword(plain) {
    if (!plain) return "";
    const data = new TextEncoder().encode(plain);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function verifyPassword(doc, plain) {
    if (!plain) return false;
    const hash = await hashPassword(plain);
    if (hash === doc.access?.passwordHash) return true;
    if (doc.access?._legacyPassword && plain === doc.access._legacyPassword) {
      doc.access.passwordHash = hash;
      delete doc.access._legacyPassword;
      return true;
    }
    return false;
  }

  function generateShareToken() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function buildShareLink(doc) {
    const token = doc.access?.shareToken || generateShareToken();
    if (!doc.access.shareToken) doc.access.shareToken = token;
    const base = location.pathname.includes("/pages/") ? "" : "pages/";
    const url = new URL(`${base}documents.html`, location.href);
    url.searchParams.set("access", doc.id);
    url.searchParams.set("token", token);
    return url.href;
  }

  /** 파일 교체 시 이전 버전 보관 */
  function archiveVersion(doc, prevUrl, prevSize, prevType) {
    if (!prevUrl) return;
    doc.versions = doc.versions || [];
    doc.versions.unshift({
      id: EditorGitHub.generateId("v"),
      storage: { provider: doc.storage?.provider || "github", path: prevUrl },
      fileUrl: prevUrl,
      fileType: prevType || doc.fileType,
      fileSize: prevSize || 0,
      uploadedAt: doc.updatedAt || doc.uploadedAt,
      archivedAt: new Date().toISOString(),
    });
  }

  /** 이미지 다운로드 워터마크 (canvas) */
  async function downloadWithWatermark(url, filename, watermarkText) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx2 = canvas.getContext("2d");
    ctx2.drawImage(img, 0, 0);
    ctx2.font = `${Math.max(14, Math.floor(img.width / 30))}px sans-serif`;
    ctx2.fillStyle = "rgba(255,255,255,0.75)";
    ctx2.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx2.fillStyle = "rgba(0,0,0,0.6)";
    ctx2.fillText(watermarkText || "Portfolio CMS", 12, canvas.height - 14);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    triggerDownload(URL.createObjectURL(blob), filename);
  }

  function triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadFile(doc) {
    const path = doc.storage?.path || doc.fileUrl || "";
    const urls = getFileUrlCandidates(doc);
    if (!urls.length) throw new Error("파일이 없습니다.");
    const ext = doc.fileType ? `.${doc.fileType}` : "";
    const name = `${doc.name}${ext}`;
    const wm = doc.access?.watermarkOnDownload;
    const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(doc.fileType);

    if (wm && isImage && !isEditMode()) {
      await downloadWithWatermark(urls[0], name, `${doc.name} — Confidential`);
      return;
    }

    for (const tryUrl of urls) {
      try {
        const res = await fetch(tryUrl);
        if (!res.ok) continue;
        const blob = await res.blob();
        triggerDownload(URL.createObjectURL(blob), name);
        return;
      } catch { /* try next */ }
    }
    triggerDownload(urls[0], name);
  }

  async function openFile(doc, { inline = true } = {}) {
    if (!hasFile(doc)) throw new Error("업로드된 파일이 없습니다.");
    if (doc.fileType === "pdf") {
      throw new Error("PDF는 「열기」로 화면에서 확인해 주세요.");
    }
    let url = getFileUrl(doc);
    if (!url) throw new Error("파일이 없습니다.");

    const needsBlob = inline && !url.startsWith("blob:") && !url.startsWith("data:");
    if (needsBlob) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const mime = blob.type || EditorUpload?.DOC_TYPES?.[doc.fileType] || "application/octet-stream";
        const viewBlob = blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: mime });
        url = URL.createObjectURL(viewBlob);
        setTimeout(() => URL.revokeObjectURL(url), 120000);
      } catch {
        /* direct URL fallback */
      }
    }

    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) throw new Error("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.");
  }

  function defaultAccessForCategory(category) {
    const isPublic = PUBLIC_CATEGORIES.has(category);
    return {
      classification: isPublic ? "public" : "private",
      visibility: isPublic ? "public" : "private",
      access: {
        allowPreview: true,
        allowDownload: false,
        watermarkOnDownload: !isPublic,
        shareToken: "",
        shareExpiresAt: "",
        passwordHash: "",
      },
    };
  }

  return {
    normalize, normalizeAll, getContext, getFileUrl, getFileUrlCandidates, hasFile, isDocumentAsset,
    isAdmin, isEditMode, hasDocAccess, canList, canPreview, canOpen, canDownload,
    visibilityLabel, classificationLabel, badgeClass,
    hashPassword, verifyPassword, unlockDoc, generateShareToken, buildShareLink,
    archiveVersion, downloadFile, downloadWithWatermark, openFile,
    defaultAccessForCategory, PUBLIC_CATEGORIES, PRIVATE_CATEGORIES, VIS_LABELS,
    isShareValid,
  };
})();

window.DocumentAccess = DocumentAccess;
