/**
 * 프로젝트 카드 → 인페이지 상세 모달
 */
const ProjectDetailModal = (() => {
  let root = null;
  let lastFocus = null;

  function esc(s) {
    return (window.PortfolioRender?.esc || window.CMS?.esc || String)(s ?? "");
  }

  function isValidUrl(url) {
    if (!url || typeof url !== "string") return false;
    const v = url.trim();
    return v && v !== "#" && v !== "javascript:void(0)";
  }

  function ensureModal() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "projectDetailModal";
    root.className = "project-detail-modal";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <div class="project-detail-modal__backdrop" data-close></div>
      <div class="project-detail-modal__panel" role="dialog" aria-modal="true" aria-labelledby="projectDetailTitle">
        <button type="button" class="project-detail-modal__close" aria-label="닫기" data-close>×</button>
        <div class="project-detail-modal__content"></div>
      </div>`;
    document.body.appendChild(root);

    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("is-open")) close();
    });
    return root;
  }

  function renderBody(p) {
    const CMS = window.CMS;
    const thumbClass = p.thumbnail ? "" : `project-detail-modal__hero--${p.thumb || "default"}`;
    const thumbUrl = p.thumbnail && CMS?.getImagePreviewUrl
      ? CMS.getImagePreviewUrl(p.thumbnail)
      : "";
    const heroStyle = thumbUrl
      ? `style="background-image:url('${esc(thumbUrl)}')"`
      : "";

    const images = (p.screenshots || p.images || []).filter(Boolean);
    const gallery = images.length
      ? `<div class="project-detail-modal__gallery">${images.map((url) =>
          `<img src="${esc(CMS?.getImagePreviewUrl?.(url) || url)}" alt="${esc(p.title)} 스크린샷" loading="lazy">`
        ).join("")}</div>`
      : "";

    const blocks = [];
    if (p.achievements) {
      blocks.push(`<section class="project-detail-modal__block"><h3>성과</h3><p>${esc(p.achievements)}</p></section>`);
    }
    if (p.learned) {
      blocks.push(`<section class="project-detail-modal__block"><h3>배운 점</h3><p>${esc(p.learned)}</p></section>`);
    }
    if (p.troubleshooting) {
      blocks.push(`<section class="project-detail-modal__block"><h3>트러블슈팅</h3><p>${esc(p.troubleshooting)}</p></section>`);
    }

    const tags = (p.tags || []).map((t) => `<span>${esc(t)}</span>`).join("");

    const links = [];
    if (isValidUrl(p.github)) {
      links.push(`<a class="project-detail-modal__link" href="${esc(p.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
    }
    if (isValidUrl(p.deployUrl)) {
      links.push(`<a class="project-detail-modal__link" href="${esc(p.deployUrl)}" target="_blank" rel="noopener noreferrer">Demo</a>`);
    }
    if (isValidUrl(p.youtube)) {
      links.push(`<a class="project-detail-modal__link" href="${esc(p.youtube)}" target="_blank" rel="noopener noreferrer">YouTube</a>`);
    }
    if (isValidUrl(p.pdf)) {
      links.push(`<a class="project-detail-modal__link" href="${esc(p.pdf)}" target="_blank" rel="noopener noreferrer">PDF</a>`);
    }
    if (isValidUrl(p.href)) {
      let href = p.href;
      if (window.CMSNav?.resolveMenuHref) href = CMSNav.resolveMenuHref(href);
      else if (window.CMSNav?.resolveHref) href = CMSNav.resolveHref(href);
      links.push(`<a class="project-detail-modal__link" href="${esc(href)}">자세한 페이지</a>`);
    }

    const linksHtml = links.length
      ? `<div class="project-detail-modal__links">${links.join("")}</div>`
      : "";

    return `
      <div class="project-detail-modal__hero ${thumbClass}" ${heroStyle}></div>
      <div class="project-detail-modal__body">
        <p class="project-detail-modal__period">${esc(p.period)}</p>
        <h2 class="project-detail-modal__title" id="projectDetailTitle">${esc(p.title)}</h2>
        ${p.type ? `<p class="project-detail-modal__type">${esc(p.type)}</p>` : ""}
        ${p.role ? `<p class="project-detail-modal__role">${esc(p.role)}</p>` : ""}
        ${p.teamSize ? `<p class="project-detail-modal__meta">팀 ${esc(p.teamSize)}인</p>` : ""}
        ${p.desc ? `<p class="project-detail-modal__desc">${esc(p.desc)}</p>` : ""}
        ${blocks.join("")}
        ${tags ? `<div class="project-detail-modal__tags">${tags}</div>` : ""}
        ${gallery}
        ${linksHtml}
      </div>`;
  }

  function open(projectId) {
    const p = window.PortfolioStore?.findItem?.("projects", projectId);
    if (!p) return;

    const modal = ensureModal();
    lastFocus = document.activeElement;
    modal.querySelector(".project-detail-modal__content").innerHTML = renderBody(p);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("project-detail-open");
    modal.querySelector(".project-detail-modal__close")?.focus();
  }

  function close() {
    if (!root) return;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("project-detail-open");
    if (lastFocus?.focus) lastFocus.focus();
    lastFocus = null;
  }

  return { open, close };
})();

window.ProjectDetailModal = ProjectDetailModal;

