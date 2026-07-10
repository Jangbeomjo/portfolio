/**
 * 공통 헤더 — GitHub 로그인 필수, 로그인한 관리자만 편집
 */
const CMSHeader = (() => {
  function render() {
    if (document.body.classList.contains("nav-open")) {
      CMSNav?.closeMenu?.();
    }

    const container = document.getElementById("headerActions");
    if (!container) return;

    const session = EditorAuth?.getSession?.() || null;
    const isEdit = document.body.classList.contains("edit-mode");
    const profile = PortfolioStore.get()?.profile || {};
    const isMobile = window.matchMedia("(max-width: 960px)").matches;

    let actionHtml = "";
    if (session?.user) {
      const editBtn = isEdit
        ? `<button type="button" class="header-actions__btn header-actions__btn--ghost" id="exitEditHeaderBtn">${isMobile ? "종료" : "편집 종료"}</button>`
        : `<button type="button" class="header-actions__btn header-actions__btn--primary" id="enterEditHeaderBtn">${isMobile ? "편집" : "편집 시작"}</button>`;
      actionHtml = `
        <div class="header-actions__user">
          <img class="header-actions__avatar" src="${CMS.esc(session.user.avatar || "")}" alt="${CMS.esc(session.user.login || "avatar")}">
          <span>${CMS.esc(session.user.login || "GitHub")}</span>
        </div>
        ${editBtn}
        <button type="button" class="header-actions__btn" id="logoutHeaderBtn">Logout</button>`;
    } else {
      actionHtml = `<button type="button" class="header-actions__btn header-actions__btn--primary" id="loginHeaderBtn">${isMobile ? "로그인" : "Login with GitHub"}</button>`;
    }

    container.innerHTML = actionHtml;
    ThemeSwitcher?.render?.(container);

    bind();
    updateBrandLogo(profile);
    CMSNav?.syncMobileNavActions?.();
  }

  function bind() {
    document.getElementById("loginHeaderBtn")?.addEventListener("click", loginHandler);
    document.getElementById("logoutHeaderBtn")?.addEventListener("click", logoutHandler);
    document.getElementById("enterEditHeaderBtn")?.addEventListener("click", () => {
      if (!EditorAuth.getSession()) {
        EditorUI.showToast("편집하려면 GitHub 로그인이 필요합니다.", "error");
        return;
      }
      InlineEditor.enterEditMode();
      render();
    });
    document.getElementById("exitEditHeaderBtn")?.addEventListener("click", () => {
      InlineEditor.exitEditMode();
      render();
    });
  }

  async function loginHandler() {
    try {
      await InlineEditor.startOAuth();
      await CMSPageActions.offerDraftRestoreAfterLogin();
      render();
    } catch (err) {
      EditorUI.showToast(err?.message || "로그인에 실패했습니다.", "error");
    }
  }

  function logoutHandler() {
    EditorAuth.clearSession();
    InlineEditor.exitEditMode();
    CMSPageActions.stripEditParamsFromUrl();
    render();
    EditorUI.showToast("로그아웃되었습니다.", "success");
  }

  function updateBrandLogo(profile) {
    const brand = document.querySelector(".brand");
    if (!brand) return;

    const session = EditorAuth?.getSession?.() || null;

    const onSubPage = /\/pages\//.test(location.pathname) || /\\pages\\/.test(location.pathname);
    if (onSubPage && profile.name) {
      brand.textContent = `← ${profile.name}`;
    }

    const logo = CMS.resolveAssetUrl(profile.logo || "./assets/profile.png");
    if (!brand.querySelector(".brand__logo") && logo) {
      const img = document.createElement("img");
      img.className = "brand__logo";
      CMS.setImageSrc(img, profile.logo || profile.avatar || "./assets/profile.png");
      img.alt = profile.name || "logo";
      brand.prepend(img);
    }

    const logoEl = brand.querySelector(".brand__logo");
    if (logoEl) {
      CMS.setImageSrc(logoEl, profile.logo || profile.avatar || "./assets/profile.png");
      if (document.body.classList.contains("edit-mode") && session?.user) {
        logoEl.dataset.editImage = "profile.avatar";
        logoEl.classList.add("is-editable-image");
        logoEl.style.cursor = "pointer";
      } else {
        delete logoEl.dataset.editImage;
        logoEl.classList.remove("is-editable-image");
        logoEl.style.cursor = "";
      }
    }
  }

  document.addEventListener("portfolio:rendered", () => {
    if (document.getElementById("headerActions")) render();
  });

  return { render, loginHandler, logoutHandler };
})();

window.CMSHeader = CMSHeader;
