/**
 * GitHub OAuth 인증 — Device Flow (정적 사이트용)
 */
const EditorAuth = (() => {
  const SESSION_KEY = "portfolio_editor_auth";
  const API = "https://api.github.com";
  let cmsConfig = null;

  async function loadConfig() {
    if (cmsConfig) return cmsConfig;
    const base = typeof DataLoader !== "undefined" ? DataLoader.BASE
      : (location.pathname.includes("/pages/") ? "../" : "./");
    const res = await fetch(`${base}data/cms-config.json`);
    if (!res.ok) throw new Error("CMS 설정을 불러오지 못했습니다.");
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) {
      throw new Error("CMS 설정 파일을 찾을 수 없습니다. 페이지를 새로고침하세요.");
    }
    cmsConfig = await res.json();
    return cmsConfig;
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function setSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getHeaders() {
    const session = getSession();
    if (!session?.token) throw new Error("GitHub 로그인이 필요합니다.");
    return {
      Authorization: `Bearer ${session.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  /** GitHub API 업로드 가능 여부 */
  function canUseGithub() {
    const session = getSession();
    return !!(session?.token && session?.repo?.owner && session?.repo?.repo);
  }

  function resolveRepoTarget(githubConfig) {
    const explicitOwner = githubConfig.owner?.trim();
    const explicitRepo = githubConfig.repo?.trim();
    if (explicitOwner && explicitRepo) return { owner: explicitOwner, repo: explicitRepo };

    const repository = githubConfig.repository?.trim() || "https://github.com/Jangbeomjo/portfolio";
    const match = repository.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (match) return { owner: match[1], repo: match[2] };

    return { owner: "Jangbeomjo", repo: "portfolio" };
  }

  async function loginWithToken(token, owner, repo, branch) {
    const userRes = await fetch(`${API}/user`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (!userRes.ok) throw new Error("GitHub 토큰이 올바르지 않거나 권한이 없습니다.");
    const user = await userRes.json();

    const repoRes = await fetch(`${API}/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!repoRes.ok) throw new Error(`저장소 접근 불가: ${owner}/${repo}`);

    const repoData = await repoRes.json();
    const canPush = repoData.permissions?.push || repoData.permissions?.admin;
    if (!canPush) throw new Error("이 저장소에 대한 쓰기 권한이 없습니다.");

    const session = {
      token,
      user: { login: user.login, avatar: user.avatar_url },
      repo: { owner, repo, branch },
      canEdit: true,
      authMethod: "token",
    };
    setSession(session);
    return session;
  }

  /** Device Flow OAuth 로그인 */
  async function loginWithOAuth(onProgress) {
    const config = await loadConfig();
    const githubConfig = config.github || {};
    const clientId = githubConfig.clientId;
    const { owner, repo } = resolveRepoTarget(githubConfig);
    const branch = githubConfig.branch || "main";

    if (!clientId) {
      const token = githubConfig.token || await new Promise((resolve, reject) => {
        const finish = (value) => {
          if (!value) return reject(new Error("GitHub 인증이 취소되었습니다. PAT를 입력해야 합니다."));
          resolve(value);
        };

        if (typeof window !== "undefined" && typeof window.EditorUI?.showTokenInputModal === "function") {
          window.EditorUI.showTokenInputModal(finish, () => reject(new Error("GitHub 인증이 취소되었습니다.")));
          return;
        }

        if (typeof window !== "undefined" && typeof window.prompt === "function") {
          const value = window.prompt("GitHub Personal Access Token을 입력하세요. repo 권한이 필요합니다.");
          finish(value);
          return;
        }

        reject(new Error("이 브라우저에서 토큰 입력을 사용할 수 없습니다."));
      });

      return loginWithToken(token, owner, repo, branch);
    }

    onProgress?.("device-code", null);
    const deviceRes = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, scope: "repo" }),
    });
    if (!deviceRes.ok) throw new Error("OAuth Device Flow 시작 실패");
    const device = await deviceRes.json();
    onProgress?.("waiting", device);

    const token = await pollToken(clientId, device.device_code, device.interval || 5);
    return loginWithToken(token, owner, repo, branch);
  }

  async function pollToken(clientId, deviceCode, interval) {
    while (true) {
      await new Promise((r) => setTimeout(r, interval * 1000));
      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });
      const data = await res.json();
      if (data.access_token) return data.access_token;
      if (data.error === "authorization_pending") continue;
      if (data.error === "slow_down") { interval += 5; continue; }
      throw new Error(data.error_description || "OAuth 인증 실패");
    }
  }

  /** 세션 유효성 및 권한 재확인 — 네트워크 오류 시 세션 유지 */
  async function validateSession() {
    const session = getSession();
    if (!session?.token || !session?.repo?.owner) return null;
    try {
      const { owner, repo } = session.repo;
      const res = await fetch(`${API}/repos/${owner}/${repo}`, { headers: getHeaders() });
      if (res.status === 401) {
        clearSession();
        return null;
      }
      if (!res.ok) return session;
      const repoData = await res.json();
      if (!repoData.permissions?.push && !repoData.permissions?.admin) {
        clearSession();
        return null;
      }
      return session;
    } catch {
      return session;
    }
  }

  return {
    loadConfig, getSession, setSession, clearSession, getHeaders, canUseGithub,
    loginWithOAuth, validateSession, loginWithToken, resolveRepoTarget,
  };
})();

window.EditorAuth = EditorAuth;
