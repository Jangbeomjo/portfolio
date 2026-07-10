/**
 * 프로젝트 상세 페이지 — CMS 헤더·네비·테마 공통 초기화
 */
(function projectPageBootstrap() {
  async function bootstrap() {
    try {
      const raw = await DataLoader.loadAllRaw();
      PortfolioStore.init(raw);
      applySeo?.(raw.seo, raw.profile);
      CMSNav.renderDesktopNav(raw.profile);
      CMSHeader.render();
      CMS.initReveal?.();
      CMS.signalPortfolioReady?.();
    } catch (err) {
      console.error("프로젝트 페이지 초기화 실패:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
