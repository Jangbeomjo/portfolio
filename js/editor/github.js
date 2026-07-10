/**
 * GitHub REST API — Publish 단일 커밋, Commit History, Rollback
 */
const EditorGitHub = (() => {
  const API = "https://api.github.com";

  function getRepoContext() {
    const s = EditorAuth.getSession();
    if (!s?.repo) throw new Error("저장소 정보 없음");
    return s.repo;
  }

  async function getFile(path) {
    const { owner, repo, branch } = getRepoContext();
    const res = await fetch(
      `${API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: EditorAuth.getHeaders() }
    );
    if (res.status === 404) return { sha: null };
    if (!res.ok) throw new Error(`파일 조회 실패: ${path}`);
    const data = await res.json();
    return { sha: data.sha, content: data.content };
  }

  /** Publish 전용 — 모든 파일을 단일 커밋으로 반영 */
  async function publishBatch(fileEntries, message) {
    const { owner, repo, branch } = getRepoContext();
    const headers = { ...EditorAuth.getHeaders(), "Content-Type": "application/json" };

    const refRes = await fetch(`${API}/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });
    if (!refRes.ok) throw new Error("브랜치 정보를 가져오지 못했습니다.");
    const refData = await refRes.json();
    const parentSha = refData.object.sha;

    const commitRes = await fetch(`${API}/repos/${owner}/${repo}/git/commits/${parentSha}`, { headers });
    if (!commitRes.ok) throw new Error("최신 커밋을 가져오지 못했습니다.");
    const parentCommit = await commitRes.json();

    const treeItems = [];
    for (const entry of fileEntries) {
      const cleanPath = entry.path.replace(/^\.\//, "");
      const blobBody = entry.encoding === "base64"
        ? { content: entry.content, encoding: "base64" }
        : { content: entry.content, encoding: "utf-8" };

      const blobRes = await fetch(`${API}/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        headers,
        body: JSON.stringify(blobBody),
      });
      if (!blobRes.ok) {
        const err = await blobRes.json().catch(() => ({}));
        throw new Error(err.message || `파일 준비 실패: ${cleanPath}`);
      }
      const blob = await blobRes.json();
      treeItems.push({ path: cleanPath, mode: entry.mode || "100644", type: "blob", sha: blob.sha });
    }

    const treeRes = await fetch(`${API}/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree: treeItems }),
    });
    if (!treeRes.ok) {
      const err = await treeRes.json().catch(() => ({}));
      throw new Error(err.message || "커밋 트리 생성 실패");
    }
    const tree = await treeRes.json();

    const newCommitRes = await fetch(`${API}/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
    });
    if (!newCommitRes.ok) {
      const err = await newCommitRes.json().catch(() => ({}));
      throw new Error(err.message || "커밋 생성 실패");
    }
    const newCommit = await newCommitRes.json();

    const updateRefRes = await fetch(`${API}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ sha: newCommit.sha }),
    });
    if (!updateRefRes.ok) {
      const err = await updateRefRes.json().catch(() => ({}));
      throw new Error(err.message || "브랜치 업데이트 실패");
    }

    return newCommit;
  }

  /** 최근 커밋 목록 */
  async function listCommits(limit = 20) {
    const { owner, repo, branch } = getRepoContext();
    const res = await fetch(
      `${API}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${limit}`,
      { headers: EditorAuth.getHeaders() }
    );
    if (!res.ok) throw new Error("커밋 기록 조회 실패");
    const data = await res.json();
    return data.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      date: c.commit.author.date,
      author: c.commit.author.name,
    }));
  }

  /** 특정 커밋 시점의 파일 내용 (Rollback용) */
  async function getFileAtCommit(path, commitSha) {
    const { owner, repo } = getRepoContext();
    const res = await fetch(
      `${API}/repos/${owner}/${repo}/contents/${path}?ref=${commitSha}`,
      { headers: EditorAuth.getHeaders() }
    );
    if (!res.ok) throw new Error("커밋 파일 조회 실패");
    const data = await res.json();
    const binary = atob(data.content.replace(/\n/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function generateId(prefix = "item") {
    return `${prefix}-${Date.now().toString(36)}`;
  }

  return { getFile, publishBatch, listCommits, getFileAtCommit, generateId };
})();

window.EditorGitHub = EditorGitHub;
