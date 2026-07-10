/**
 * GitHub Publish 고급 설정 — Token, Repo, Branch, Commit History, Rollback
 */
const GitHubPanel = (() => {
  function open() {
    const session = EditorAuth.getSession();
    if (!session) { EditorUI.showToast("로그인이 필요합니다.", "error"); return; }

    const { owner, repo, branch } = session.repo;
    EditorUI.openModal({
      title: "GitHub 설정",
      body: `
        <div class="editor-form">
          <label>Token <small>(마스킹됨)</small>
            <input id="ghToken" type="password" value="${CMS.esc(session.token?.slice(0, 8) || "")}..." readonly>
          </label>
          <label>Owner<input id="ghOwner" value="${CMS.esc(owner)}"></label>
          <label>Repository<input id="ghRepo" value="${CMS.esc(repo)}"></label>
          <label>Branch<input id="ghBranch" value="${CMS.esc(branch)}"></label>
          <p class="editor-form__hint">Publish 시 커밋 메시지: <strong>CMS: 콘텐츠 Publish</strong> (단일 커밋)</p>
          <div class="editor-form__actions">
            <button type="button" class="editor-toolbar__btn" id="ghLoadHistory">Commit History</button>
            <button type="button" class="editor-toolbar__btn" id="ghApplyRepo">저장소 적용</button>
          </div>
          <div id="ghHistoryList" class="gh-history-list"></div>
        </div>`,
      foot: `<button class="editor-toolbar__btn editor-toolbar__btn--ghost" id="ghClose">닫기</button>`,
    });

    document.getElementById("ghClose").onclick = EditorUI.closeModal;
    document.getElementById("ghApplyRepo").onclick = applyRepo;
    document.getElementById("ghLoadHistory").onclick = loadHistory;
  }

  function applyRepo() {
    const session = EditorAuth.getSession();
    if (!session) return;
    session.repo = {
      owner: document.getElementById("ghOwner").value.trim(),
      repo: document.getElementById("ghRepo").value.trim(),
      branch: document.getElementById("ghBranch").value.trim() || "main",
    };
    EditorAuth.setSession(session);
    EditorUI.showToast("저장소 설정이 적용되었습니다.", "success");
  }

  async function loadHistory() {
    const list = document.getElementById("ghHistoryList");
    if (!list) return;
    list.innerHTML = `<p class="editor-loading-text">불러오는 중...</p>`;
    try {
      const commits = await EditorGitHub.listCommits(15);
      list.innerHTML = commits.length
        ? commits.map((c) => `
          <div class="gh-history-item">
            <div>
              <strong>${CMS.esc(c.message)}</strong>
              <small>${new Date(c.date).toLocaleString("ko-KR")} · ${CMS.esc(c.author)}</small>
            </div>
            <button type="button" class="edit-ctrl-btn" data-rollback-sha="${c.sha}" title="Rollback">↩</button>
          </div>`).join("")
        : `<p>커밋 기록이 없습니다.</p>`;

      list.querySelectorAll("[data-rollback-sha]").forEach((btn) => {
        btn.onclick = () => rollback(btn.dataset.rollbackSha);
      });
    } catch (err) {
      list.innerHTML = `<p class="editor-toast--error">${CMS.esc(err.message)}</p>`;
    }
  }

  async function rollback(sha) {
    const ok = await EditorUI.confirm("이 커밋 상태로 data/profile.json을 복원하시겠습니까?");
    if (!ok) return;
    EditorUI.showLoading("Rollback 중...");
    try {
      const content = await EditorGitHub.getFileAtCommit("data/profile.json", sha);
      if (content) {
        const profile = JSON.parse(content);
        PortfolioStore.get().profile = { ...PortfolioStore.get().profile, ...profile };
        PortfolioStore.notifyChange();
        CMS.rerender();
        EditorUI.closeModal();
        EditorUI.showToast("Rollback 완료 (Draft). Publish로 반영하세요.", "success");
      }
    } catch (err) {
      EditorUI.closeModal();
      EditorUI.showToast(err.message, "error");
    }
  }

  return { open };
})();

window.GitHubPanel = GitHubPanel;
