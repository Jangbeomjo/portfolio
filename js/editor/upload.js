/**
 * 파일 업로드 — 이미지/PDF/문서, 압축 지원
 */
const EditorUpload = (() => {
  const MAX = 10 * 1024 * 1024;
  const DOC_TYPES = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    hwp: "application/x-hwp",
    zip: "application/zip",
  };

  function sanitize(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  }

  async function uploadImage(file, compress = true) {
    if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드 가능합니다.");
    if (file.size > MAX) throw new Error("파일 크기는 10MB 이하여야 합니다.");
    const processed = compress && window.CMS?.compressImage ? await CMS.compressImage(file) : file;
    const filename = `${Date.now()}-${sanitize(processed.name)}`;
    const path = `assets/images/${filename}`;
    return EditorGitHub.uploadBinary(path, processed, `CMS: 이미지 업로드 ${filename}`);
  }

  async function uploadPdf(file) {
    if (file.type !== "application/pdf") throw new Error("PDF 파일만 업로드 가능합니다.");
    if (file.size > MAX) throw new Error("파일 크기는 10MB 이하여야 합니다.");
    const filename = `${Date.now()}-${sanitize(file.name)}`;
    const path = `assets/docs/${filename}`;
    return EditorGitHub.uploadBinary(path, file, `CMS: PDF 업로드 ${filename}`);
  }

  /** 범용 파일 업로드 — PDF, 이미지, DOCX, HWP, ZIP */
  async function uploadFile(file) {
    if (file.size > MAX) throw new Error("파일 크기는 10MB 이하여야 합니다.");
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return uploadImage(file);
    if (ext === "pdf") return uploadPdf(file);
    const filename = `${Date.now()}-${sanitize(file.name)}`;
    const path = `assets/docs/${filename}`;
    return EditorGitHub.uploadBinary(path, file, `CMS: 파일 업로드 ${filename}`);
  }

  function pick(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.addEventListener("change", () => resolve(input.files[0] || null));
      input.click();
    });
  }

  function pickMultiple(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = true;
      input.addEventListener("change", () => resolve([...input.files]));
      input.click();
    });
  }

  return { uploadImage, uploadPdf, uploadFile, pick, pickMultiple, MAX, DOC_TYPES };
})();

window.EditorUpload = EditorUpload;
