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
    const storage = {
      provider: doc.storage?.provider || "github",
      path,
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
      fileUrl: path,
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
    if (!doc) return "";
    const path = doc.storage?.path || doc.fileUrl || "";
    return path ? CMS.resolveAssetUrl(path) : "";
  }

  function hasFile(doc) {
    const path = doc?.storage?.path || doc?.fileUrl || "";
    return typeof path === "string" && path.trim().length > 0;
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
    if (isEditMode()) return true;
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

  function canDownload(doc, ctx = getContext()) {
    if (!hasDocAccess(doc, ctx)) return false;
    if (isEditMode()) return !!getFileUrl(doc);
    if (!doc.access?.allowDownload) return false;
    return !!getFileUrl(doc);
  }

  function canList(doc, ctx = getContext()) {
    if (isEditMode() || isAdmin()) return true;
    if (doc.visibility === "public" && doc.access?.allowPreview) return true;
    if (doc.visibility === "link" && isShareValid(doc, ctx)) return true;
    if (doc.visibility === "password" && isPasswordUnlocked(doc, ctx)) return true;
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
    const url = getFileUrl(doc);
    if (!url) throw new Error("파일이 없습니다.");
    const ext = doc.fileType ? `.${doc.fileType}` : "";
    const name = `${doc.name}${ext}`;
    const wm = doc.access?.watermarkOnDownload;
    const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(doc.fileType);

    if (wm && isImage && !isEditMode()) {
      await downloadWithWatermark(url, name, `${doc.name} — Confidential`);
      return;
    }
    triggerDownload(url, name);
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
    normalize, normalizeAll, getContext, getFileUrl, hasFile,
    isAdmin, isEditMode, hasDocAccess, canList, canPreview, canDownload,
    visibilityLabel, classificationLabel, badgeClass,
    hashPassword, verifyPassword, unlockDoc, generateShareToken, buildShareLink,
    archiveVersion, downloadFile, downloadWithWatermark,
    defaultAccessForCategory, PUBLIC_CATEGORIES, PRIVATE_CATEGORIES, VIS_LABELS,
    isShareValid,
  };
})();

window.DocumentAccess = DocumentAccess;
