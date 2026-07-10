/**
 * Projects 전체 목록 페이지 — 추가·수정·삭제 (편집 모드)
 */
(function projectsPage() {
  let ready = false;

  function esc(str) {
    return PortfolioRender.esc(str);
  }

  async function bootstrap() {
    if (ready) return;
    try {
      const raw = await DataLoader.loadAllRaw();
      PortfolioStore.init(raw);
      await CMSPageActions.restoreDraftOnLoad?.();
      EditorHistory.reset(PortfolioStore.get());
      bindActionHub();
      renderProjectsPage();
      CMSHeader.render();
      CMS.initReveal?.();
      CMS.signalPortfolioReady?.();
      setTimeout(() => CMS.restoreReturnScroll?.(), 80);
      ready = true;
    } catch (err) {
      console.error(err);
      showError("프로젝트 데이터를 불러오지 못했습니다.");
    }
  }

  function showError(msg) {
    const grid = document.getElementById("projectsPageGrid");
    const hint = DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()
      ? "<code>python scripts/bundle-data.py</code> 실행 또는 <code>start-server.bat</code> 사용"
      : "<code>start-server.bat</code>으로 localhost에서 다시 시도하세요.";
    if (grid) grid.innerHTML = `<p class="doc-empty-hint">${msg}<br>${hint}</p>`;
    EditorUI?.showToast?.(msg, "error");
  }

  function bindActionHub() {
    document.getElementById("projectAddBtn")?.addEventListener("click", () => {
      CMSPageActions.runWithEditor(() => {
        if (window.InlineEditor?.addProject) {
          window.InlineEditor.addProject();
        } else {
          document.querySelector('.edit-add-btn[data-for="projectsPageGrid"]')?.click();
        }
      });
    });
  }

  function renderProjectsPage() {
    const grid = document.getElementById("projectsPageGrid");
    if (!grid) return;

    const isEdit = document.body.classList.contains("edit-mode");
    const items = PortfolioRender.sortByOrder(PortfolioStore.get().projects?.items || [])
      .filter((p) => isEdit || (!p.hidden && p.visibility !== "private"));

    if (!items.length) {
      grid.innerHTML = isEdit
        ? `<p class="doc-empty-hint">등록된 프로젝트가 없습니다. 「+ 프로젝트 추가」를 누르세요.</p>`
        : `<p class="doc-empty-hint">등록된 프로젝트가 없습니다.</p>`;
      return;
    }

    grid.innerHTML = items.map((p) => PortfolioRender.renderProjectCard(p)).join("");
    grid.querySelectorAll(".project-card[data-href]").forEach((c) => { delete c.dataset.navBound; });
    PortfolioRender.bindProjectCardClicks();

    if (isEdit && window.InlineEditor?.refreshEditState) {
      window.InlineEditor.refreshEditState();
    }
  }

  window.renderProjectsPage = renderProjectsPage;
  window.rerenderAllProjects = function rerenderAllProjects() {
    window.renderPortfolio?.(["projects"]);
    renderProjectsPage();
  };

  document.addEventListener("portfolio:rendered", () => {
    if (document.getElementById("projectsPageGrid")) renderProjectsPage();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
