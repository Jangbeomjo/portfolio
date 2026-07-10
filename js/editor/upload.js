/**
 * 파일 선택 UI — 편집 중 업로드는 Draft(LocalStorage)에만 저장, GitHub는 Publish 시 반영
 */
const EditorUpload = (() => {
  const MAX = 10 * 1024 * 1024;

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

  return { pick, pickMultiple, MAX };
})();

window.EditorUpload = EditorUpload;
