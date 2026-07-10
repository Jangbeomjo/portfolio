/**
 * 포트폴리오 메인 렌더러 — JSON 데이터 기반 부분 DOM 업데이트
 * data-edit-* 속성으로 인라인 편집 대상 식별
 */
(async function bootstrap() {
  if (document.getElementById("projectsPageGrid")) return;
  document.body.classList.add("is-loading");
  try {
    const loaded = await DataLoader.loadPortfolio();
    PortfolioStore.init(loaded.raw);

    // Draft 복구 — 로그인한 관리자만
    if (EditorAuth?.getSession?.() && EditorAutosave.hasDraft()) {
      const restore = await EditorAutosave.promptRestore();
      if (restore) {
        const draft = EditorAutosave.loadDraft();
        if (draft) PortfolioStore.importAll(draft);
      }
    }

    EditorHistory.reset(PortfolioStore.get());
    window.renderPortfolio();
    CMS.signalPortfolioReady?.();
  } catch (err) {
    console.error("포트폴리오 데이터 로드 실패:", err);
    if (DataLoader.isFileProtocol?.() && !DataLoader.hasBundledData?.()) {
      showToast("데이터 번들이 없습니다. python scripts/bundle-data.py 실행 또는 start-server.bat 사용");
    } else {
      showToast("콘텐츠를 불러오지 못했습니다.");
    }
  } finally {
    document.body.classList.remove("is-loading");
  }
})();

/** 렌더 가능 섹션 키 */
const RENDER_SECTIONS = [
  "header", "hero", "about", "career", "skills", "education",
  "projects", "activities", "training", "certificates", "awards",
  "contact", "footer", "seo", "theme",
];

/** 스크롤·포커스·커서 상태 보존 */
function preserveViewState(fn) {
  const scrollY = window.scrollY;
  const active = document.activeElement;
  const field = active?.dataset?.editField;
  const listId = active?.closest?.("[data-edit-id]")?.dataset?.editId;
  const sel = window.getSelection?.();
  const offset = sel?.rangeCount && active?.isContentEditable
    ? sel.getRangeAt(0).startOffset : null;

  fn();

  requestAnimationFrame(() => {
    window.scrollTo(0, scrollY);
    if (field && listId) {
      const el = document.querySelector(`[data-edit-id="${listId}"] [data-edit-field="${field}"]`)
        || document.querySelector(`[data-edit-field="${field}"]`);
      if (el?.isContentEditable) {
        el.focus();
        if (offset != null && el.firstChild) {
          try {
            const range = document.createRange();
            range.setStart(el.firstChild, Math.min(offset, el.textContent.length));
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch { /* ignore */ }
        }
      }
    }
  });
}

/**
 * 전체 또는 부분 렌더
 * @param {string[]} [sections] — 생략 시 전체 렌더
 */
window.renderPortfolio = function renderPortfolio(sections) {
  const all = !sections || !sections.length;
  const set = all ? new Set(RENDER_SECTIONS) : new Set(sections);

  preserveViewState(() => {
    const data = PortfolioStore.get();
    const { profile, projects, skills, education, experience, certificates, awards, training, seo, theme } = data;

    if (set.has("seo") || all) applySeo(seo, profile);
    if (set.has("theme") || all) {
      applyTheme(mergeThemeWithVisitorChoice(theme));
      renderEducationMedia(profile);
    }
    if (set.has("header") || all) updateHeader(profile);
    if (set.has("hero") || all) updateHero(profile);
    if (set.has("about") || all) updateAbout(profile, education, data.about);
    if (set.has("career") || all) updateCareer(experience);
    if (set.has("education") || all) {
      updateEducation(education, profile);
      renderEducationMedia(profile);
    }
    if (set.has("skills") || all) updateSkills(skills);
    if (set.has("activities") || all) {
      updateExperience(experience);
      renderActivitiesBackground(profile);
    }
    if (set.has("training") || all) updateTraining(training);
    if (set.has("certificates") || all) updateCertificates(certificates);
    if (set.has("awards") || all) updateAwards(awards);
    if (set.has("projects") || all) updateProjects(projects);
    if (set.has("contact") || all) updateContact(profile);
    if (set.has("footer") || all) updateFooter(profile);

    bindDynamicInteractions();
  });

  document.dispatchEvent(new CustomEvent("portfolio:rendered"));
};

// ─── 부분 렌더 함수 ─────────────────────────────────────────

function updateHeader(profile) {
  renderHeaderNav(profile);
  renderHeaderActions();
}

function updateHero(profile) {
  const eyebrow = document.querySelector(".hero-eyebrow");
  if (eyebrow) {
    eyebrow.textContent = `${profile.role} · Portfolio`;
    eyebrow.dataset.editField = "profile.role";
  }
  renderHeroName(profile.nameEn || profile.name);
  setEditableText("heroIntro", profile.intro, "profile.intro");
  setEditableText("heroTaglineEn", profile.taglineEn, "profile.taglineEn");
  renderHeroLinks(profile.links);
  renderProfileImages(profile);
  renderDetailLines("heroIntroLines", profile.introLines, "introLines", false);
}

function updateAbout(profile, education, about) {
  setEditableText("aboutText", profile.intro, "profile.intro");
  setEditableText("aboutExtra", profile.aboutExtra, "profile.aboutExtra");
  renderDetailLines("aboutIntroLines", profile.introLines, "introLines", false);
  renderAboutSections(about || profile.about || {});

  const signature = document.querySelector(".signature");
  if (signature) {
    signature.textContent = profile.signature || "";
    signature.dataset.editField = "profile.signature";
  }

  const eduItems = sortByOrder(education.items);
  renderList("eduCompact", eduItems, renderEduCompact);
}

function renderCoreStack(skills) {
  const container = document.getElementById("coreStackLines");
  if (!container) return;
  const items = sortByOrder(skills?.stackLines || []);
  if (!items.length) {
    container.innerHTML = document.body.classList.contains("edit-mode")
      ? `<p class="stack-line-empty">+ 스택 추가 버튼으로 항목을 추가하세요.</p>`
      : "";
    return;
  }
  container.innerHTML = items.map((line) =>
    `<p class="stack-line edit-list-item" data-edit-list="stackLines" data-edit-id="${line.id}">
      <span data-edit-field="label">${esc(line.label)}</span>
      <span data-edit-field="text">${esc(line.text)}</span>
    </p>`
  ).join("");
}

function updateCareer(experience) {
  const careers = sortByOrder(experience.items).filter((i) => i.category === "career");
  const tpl = (c) =>
    `<li class="edit-list-item" data-edit-list="experience" data-edit-id="${c.id}">
      <time data-edit-field="period">${esc(c.period)}</time>
      <div>
        <strong data-edit-field="company">${esc(c.company || c.title)}</strong>
        <span data-edit-field="role">${esc(c.role || "")}</span>
        <p data-edit-field="desc">${esc(c.desc || c.description || "")}</p>
        <p class="edit-only" data-edit-field="achievements">${esc(c.achievements || "성과")}</p>
        <small class="edit-only" data-edit-field="tech">${esc((c.tech || []).join(", ") || "기술")}</small>
      </div>
    </li>`;
  renderList("careerCompact", careers, tpl);
  renderList("careerTimeline", careers, tpl);
  ["careerCompact", "careerTimeline"].forEach((id) => {
    const el = document.getElementById(id);
    if (el?.parentElement) {
      el.parentElement.style.display = careers.length || document.body.classList.contains("edit-mode") ? "" : "none";
    }
  });
}

function updateSkills(skills) {
  const skillBars = sortByOrder(skills.bars);
  renderList("skillBars", skillBars, renderSkillBar);
  renderList("techCloud", skills.tags || [], (t, i) =>
    `<span class="tech-tag" data-edit-tag-index="${i}">${esc(t)}</span>`
  );
  // 카테고리별 그룹
  const catEl = document.getElementById("skillCategories");
  if (catEl) {
    const groups = {};
    skillBars.forEach((s) => {
      const cat = s.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    catEl.innerHTML = Object.entries(groups).map(([cat, items]) =>
      `<div class="skill-category"><h4>${esc(cat)}</h4><ul>${items.map((s) =>
        `<li><span>${esc(s.name)}</span> <em>${s.level}%</em></li>`
      ).join("")}</ul></div>`
    ).join("");
  }
  renderCoreStack(skills);
}

function updateTraining(training) {
  const items = sortByOrder(training.items);
  renderList("trainingGrid", items, (t) =>
    `<div class="training-card edit-list-item" data-edit-list="training" data-edit-id="${t.id}">
      <span class="training-card__type" data-edit-field="type">${esc(t.type || "bootcamp")}</span>
      <time data-edit-field="period">${esc(t.period)}</time>
      <h4 data-edit-field="title">${esc(t.title)}</h4>
      <p data-edit-field="desc">${esc(t.desc || "")}</p>
      <small data-edit-field="organization">${esc(t.organization || "")}</small>
    </div>`
  );
}

function updateCertificates(certificates) {
  const items = sortByOrder(certificates.items);
  renderList("certList", items, (c) =>
    `<li class="cert-item edit-list-item" data-edit-list="certificates" data-edit-id="${c.id}">
      <strong data-edit-field="name">${esc(c.name)}</strong>
      <span data-edit-field="date">${esc(c.date)}</span>
      <span data-edit-field="issuer">${esc(c.issuer || "")}</span>
      ${c.proofUrl ? `<a href="${esc(c.proofUrl)}" target="_blank" rel="noopener" class="text-link edit-only">증빙</a>` : ""}
      <button type="button" class="edit-only edit-ctrl-btn" data-cert-upload="${c.id}" title="증빙 업로드">↑</button>
    </li>`
  );
}

function updateAwards(awards) {
  const items = sortByOrder(awards.items);
  renderList("awardList", items, (a) =>
    `<li class="award-item edit-list-item" data-edit-list="awards" data-edit-id="${a.id}">
      <strong data-edit-field="title">${esc(a.title)}</strong>
      <span data-edit-field="organization">${esc(a.organization || "")}</span>
      <time data-edit-field="date">${esc(a.date)}</time>
      <p data-edit-field="description">${esc(a.description || "")}</p>
      ${a.proofUrl ? `<a href="${esc(a.proofUrl)}" target="_blank" rel="noopener" class="text-link">증빙</a>` : ""}
    </li>`
  );
}

function updateEducation(education, profile) {
  const eduItems = sortByOrder(education.items);
  renderList("eduTimeline", eduItems, renderEduTimeline);
  renderDetailLines("resumeLines", profile.resumeLines, "resumeLines", true);
  renderEducationResumeLink(profile.links?.resume);
}

function updateProjects(projects) {
  const isEdit = document.body.classList.contains("edit-mode");
  const projectItems = sortByOrder(projects.items).filter((p) => isEdit || (!p.hidden && p.visibility !== "private"));
  renderList("projectGrid", projectItems, renderProjectCard);
}

function updateExperience(experience) {
  const activities = sortByOrder(experience.items).filter((i) => i.category === "activity");
  renderList("activityGrid", activities, renderActivityCard);
}

function updateContact(profile) {
  renderContact(profile);
}

function updateFooter(profile) {
  renderFooter(profile);
}

/** About 확장 섹션 렌더 */
function renderAboutSections(about) {
  const container = document.getElementById("aboutSections");
  if (!container) return;
  const fields = [
    { key: "tagline", label: "한 줄 소개" },
    { key: "intro", label: "자기소개" },
    { key: "growth", label: "성장 과정" },
    { key: "strengths", label: "강점" },
    { key: "collaboration", label: "협업 경험" },
    { key: "goals", label: "목표" },
  ];
  container.innerHTML = fields.map(({ key, label }) =>
    about[key] || document.body.classList.contains("edit-mode")
      ? `<div class="about-section-block"><h4>${label}</h4><p data-edit-field="about.${key}">${esc(about[key] || "")}</p></div>`
      : ""
  ).join("");
}

// ─── 템플릿 헬퍼 ───────────────────────────────────────────

function esc(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function sortByOrder(items) {
  return [...(items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function setEditableText(id, text, field) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.dataset.editField = field;
}

function renderHeroName(nameEn) {
  const el = document.querySelector(".hero-name");
  if (!el || !nameEn) return;
  const parts = nameEn.split(" ");
  el.innerHTML = parts.length >= 2
    ? `${esc(parts[0])}<br>${esc(parts.slice(1).join(" "))}`
    : esc(nameEn);
  el.dataset.editField = "profile.nameEn";
}

function renderHeaderNav(profile) {
  CMSNav?.renderDesktopNav?.(profile);
}


function renderHeaderActions() {
  CMSHeader?.render?.();
}

function renderHeroLinks(links) {
  if (!links) return;
  const container = document.querySelector(".hero-links");
  if (!container) return;
  const items = [];
  if (links.github) items.push(`<a href="${esc(links.github)}" data-edit-field="links.github" target="_blank" rel="noopener">GITHUB</a>`);
  if (links.resume) items.push(`<a href="${esc(links.resume)}" data-edit-field="links.resume" target="_blank" rel="noopener">RESUME</a>`);
  container.innerHTML = items.length ? items.join("<span>—</span>") : "";
  container.dataset.editGroup = "profile.links";
}

function renderProfileImages(profile) {
  const fallback = "./assets/profile.png";
  document.querySelectorAll(".portrait-frame img").forEach((img) => {
    const isAbout = img.closest(".portrait-frame--about");
    const source = isAbout ? (profile.aboutImage || profile.avatar) : profile.avatar;
    CMS.setImageSrc(img, source, fallback);
    if (profile.name) img.alt = `${profile.name} 프로필`;
    img.dataset.editImage = isAbout ? "profile.aboutImage" : "profile.avatar";
  });
  renderEducationMedia(profile);
  renderActivitiesBackground(profile);
}

/** EDUCATION — 왼쪽 패널 배경 + 오른쪽 사진 */
function renderEducationMedia(profile) {
  renderEducationPanelBackground(profile);
  renderEducationPhoto(profile);
}

function renderEducationPanelBackground(profile) {
  const bg = document.querySelector(".education-panel__bg");
  const btn = document.querySelector(".education-panel__bg-btn");
  if (!bg) return;

  const path = profile.educationPanelBackground || "";
  if (path) {
    const url = CMS.getImagePreviewUrl(path) || CMS.resolveAssetUrl(path);
    const safe = (url || "").replace(/'/g, "%27");
    const overlay = getComputedStyle(document.documentElement).getPropertyValue("--panel-overlay").trim()
      || "linear-gradient(rgba(92, 26, 42, 0.85), rgba(92, 26, 42, 0.9))";
    bg.style.backgroundImage = `${overlay}, url('${safe}')`;
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
    bg.classList.add("has-image");
    if (btn) btn.textContent = "배경 변경";
  } else {
    bg.style.backgroundImage = "";
    bg.classList.remove("has-image");
    if (btn) btn.textContent = "+ 배경 추가";
  }
  bg.dataset.editImage = "profile.educationPanelBackground";
}

function renderEducationPhoto(profile) {
  const img = document.querySelector(".education-visual__img");
  if (!img) return;
  const fallback = profile.avatar || "./assets/profile.png";
  const source = profile.educationImage || profile.backgroundImage || fallback;
  CMS.setImageSrc(img, source, fallback);
  if (profile.name) img.alt = `${profile.name} Education`;
  img.dataset.editImage = "profile.educationImage";
}

/** ACTIVITIES 섹션 배경 이미지 */
function renderActivitiesBackground(profile) {
  const el = document.querySelector(".section-activities__bg");
  if (!el) return;
  const fallback = profile.avatar || "./assets/profile.png";
  const path = profile.activitiesBackgroundImage || fallback;
  const url = CMS.getImagePreviewUrl(path) || CMS.resolveAssetUrl(fallback);
  const safe = (url || "").replace(/'/g, "%27");
  el.style.backgroundImage = `linear-gradient(var(--overlay-bg), var(--overlay-bg)), url('${safe}')`;
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
  el.dataset.editImage = "profile.activitiesBackgroundImage";
}

function renderDetailLines(containerId, lines, listKey, isLight) {
  const items = sortByOrder(lines);
  renderList(containerId, items, (line) =>
    `<li class="edit-list-item" data-edit-list="${listKey}" data-edit-id="${line.id}">
      <span data-edit-field="text">${esc(line.text)}</span>
    </li>`
  );
  const container = document.getElementById(containerId);
  if (container) {
    container.classList.toggle("detail-lines--light", isLight);
    const heading = container.previousElementSibling;
    if (heading?.classList.contains("detail-lines__heading")) {
      heading.style.display = items.length || document.body.classList.contains("edit-mode") ? "" : "none";
    }
    container.style.display = items.length || document.body.classList.contains("edit-mode") ? "" : "none";
  }
}

function renderEducationResumeLink(resumeUrl) {
  const link = document.getElementById("eduResumeLink");
  if (!link) return;
  if (resumeUrl) { link.href = resumeUrl; link.style.display = ""; }
  else if (!document.body.classList.contains("edit-mode")) link.style.display = "none";
}

function renderEduCompact(e) {
  return `<li class="edit-list-item" data-edit-list="education" data-edit-id="${e.id}">
    <time data-edit-field="period">${esc(e.period)}</time>
    <p><strong data-edit-field="school">${esc(e.school || e.title)}</strong> <span data-edit-field="major">${esc(e.major || "")}</span></p>
  </li>`;
}

function renderEduTimeline(e) {
  return `<li class="edit-list-item" data-edit-list="education" data-edit-id="${e.id}">
    <time data-edit-field="period">${esc(e.period)}</time>
    <div>
      <strong data-edit-field="school">${esc(e.school || e.title)}</strong>
      <span data-edit-field="major">${esc(e.major || "")}</span>
      <span class="edit-only" data-edit-field="minor">${esc(e.minor || "부전공")}</span>
      <p data-edit-field="desc">${esc(e.desc || "")}</p>
      <small data-edit-field="gpa">${esc(e.gpa ? `학점 ${e.gpa}` : "")}</small>
      <small data-edit-field="graduated">${esc(e.graduated || "")}</small>
    </div>
  </li>`;
}

function renderSkillBar(s) {
  return `<div class="skill-bar" data-edit-list="skills" data-edit-id="${s.id}">
    <div class="skill-bar__label">
      <span data-edit-field="name">${esc(s.name)}</span>
      <span data-edit-field="stack">${esc(s.stack)}</span>
    </div>
    <div class="skill-bar__track" data-edit-level="${s.level}">
      <div class="skill-bar__fill" style="--w:${s.level}%"></div>
    </div>
    <span class="skill-bar__meta" data-edit-field="category">${esc(s.category)}</span>
  </div>`;
}

function renderProjectCard(p) {
  const thumbClass = p.thumbnail ? "" : `project-card__thumb--${p.thumb || "default"}`;
  const thumbUrl = p.thumbnail ? CMS.getImagePreviewUrl(p.thumbnail) : "";
  const thumbStyle = thumbUrl
    ? `style="background-image:url('${esc(thumbUrl)}');background-size:cover;background-position:center"`
    : "";
  const tags = (p.tags || []).map((t, i) => `<span data-edit-tag-index="${i}">${esc(t)}</span>`).join("");
  const screenshots = (p.screenshots || p.images || []).map((url, i) =>
    `<img class="project-screenshot edit-only" src="${esc(CMS.getImagePreviewUrl(url))}" data-screenshot-index="${i}" data-edit-image="screenshots" alt="">`
  ).join("");
  const hiddenBadge = p.hidden ? `<span class="edit-hidden-badge">숨김</span>` : "";
  const featured = p.featured ? `<span class="edit-featured-badge">대표</span>` : "";
  const visBadge = p.visibility === "private" ? `<span class="edit-hidden-badge">비공개</span>` : "";
  const statusLabel = p.status ? `<span class="project-status">${esc(p.status)}</span>` : "";

  return `<article class="project-card${p.hidden ? " is-hidden-project" : ""}${p.featured ? " is-featured" : ""}"
    data-edit-list="projects" data-edit-id="${p.id}" data-href="${esc(p.href || "#")}" tabindex="0" role="link">
    <div class="project-card__controls edit-only"></div>
    ${hiddenBadge}${featured}${visBadge}
    <div class="project-card__thumb ${thumbClass}" data-edit-image="thumbnail" ${thumbStyle}></div>
    <div class="project-card__screenshots edit-only">${screenshots}<button type="button" class="edit-tag-add edit-only" data-add-screenshot="${p.id}">+ 스크린샷</button></div>
    <div class="project-card__body">
      <div class="project-card__meta">
        <h3 data-edit-field="title">${esc(p.title)}</h3>
        ${statusLabel}
        <a class="project-card__gh" href="${esc(p.github || "#")}" data-edit-field="github" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗</a>
      </div>
      <time data-edit-field="period">${esc(p.period)}</time>
      <small data-edit-field="type">${esc(p.type)}</small>
      <small data-edit-field="role">${esc(p.role || "")}</small>
      <small class="edit-only" data-edit-field="teamSize">${esc(p.teamSize ? `팀 ${p.teamSize}인` : "팀 인원")}</small>
      <p data-edit-field="desc">${esc(p.desc)}</p>
      <p class="edit-only" data-edit-field="achievements">${esc(p.achievements || "성과")}</p>
      <p class="edit-only" data-edit-field="troubleshooting">${esc(p.troubleshooting || "트러블슈팅")}</p>
      <p class="edit-only" data-edit-field="learned">${esc(p.learned || "배운 점")}</p>
      <div class="project-card__tags" data-edit-tags="tags">${tags}</div>
      <small class="edit-only project-href" data-edit-field="href">${esc(p.href || "상세 페이지 경로 (예: ./pages/project.html)")}</small>
      <small class="edit-only project-deploy" data-edit-field="deployUrl">${esc(p.deployUrl || "Demo URL")}</small>
      <small class="edit-only" data-edit-field="youtube">${esc(p.youtube || "YouTube URL")}</small>
    </div>
  </article>`;
}

function renderActivityCard(a) {
  return `<div class="activity-card edit-list-item" data-edit-list="experience" data-edit-id="${a.id}">
    <span class="activity-card__type edit-only" data-edit-field="activityType">${esc(a.activityType || a.sub || "")}</span>
    <time data-edit-field="period">${esc(a.period)}</time>
    <p data-edit-field="title">${esc(a.title)}</p>
    <small data-edit-field="sub">${esc(a.sub || a.description)}</small>
    <small class="edit-only" data-edit-field="organization">${esc(a.organization || a.company || "")}</small>
  </div>`;
}

function renderContact(profile) {
  const links = profile.links || {};
  const row = document.querySelector(".contact-row");
  if (!row) return;
  const lead = document.querySelector(".contact-lead");
  if (lead) {
    lead.textContent = profile.contactLead || "언제나 환영합니다.";
    lead.dataset.editField = "profile.contactLead";
  }
  const isEdit = document.body.classList.contains("edit-mode");
  const contactFields = [
    ["E-MAIL", "profile.email", profile.email],
    ["PHONE", "profile.phone", profile.phone],
    ["GITHUB", "profile.links.github", links.github || ""],
    ["VELOG", "profile.links.velog", links.velog || ""],
    ["BLOG", "profile.links.blog", links.blog || ""],
    ["LINKEDIN", "profile.links.linkedin", links.linkedin || ""],
    ["INSTAGRAM", "profile.links.instagram", links.instagram || ""],
    ["YOUTUBE", "profile.links.youtube", links.youtube || ""],
    ["NOTION", "profile.links.notion", links.notion || ""],
    ["RESUME", "profile.links.resume", links.resume || ""],
  ];
  row.innerHTML = contactFields
    .filter(([, , val]) => isEdit || val)
    .map(([dt, field, val]) => {
      const text = val ? esc(val) : "";
      const ddInner = isEdit
        ? `<span class="contact-link-field" data-edit-field="${field}" data-placeholder="https://...">${text}</span>`
        : (val ? `<a href="${esc(val)}" target="_blank" rel="noopener">${esc(val)}</a>` : "");
      return `<div class="contact-field">
        <dt>${dt}</dt>
        <dd>${ddInner}</dd>
      </div>`;
    }).join("");
}

function renderFooter(profile) {
  const footer = document.querySelector(".site-footer p");
  if (footer) {
    footer.textContent = profile.footerText || `© ${new Date().getFullYear()} ${profile.nameEn || profile.name}. ALL RIGHTS RESERVED.`;
    footer.dataset.editField = "profile.footerText";
  }
}

function renderList(id, items, templateFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map((item, i) => templateFn(item, i)).join("");
}

// ─── 인터랙션 (1회 바인딩 + 동적 재바인딩) ────────────────

let staticInteractionsBound = false;

function initStaticInteractions() {
  if (staticInteractionsBound) return;
  staticInteractionsBound = true;

  const header = document.getElementById("header");
  if (document.getElementById("navMobile")) CMSNav?.init?.();

  window.addEventListener("scroll", () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 40);
    const sections = document.querySelectorAll("section[id]");
    let current = "";
    sections.forEach((sec) => { if (window.scrollY >= sec.offsetTop - 120) current = sec.id; });
    document.querySelectorAll("[data-nav]").forEach((link) =>
      link.classList.toggle("is-active", link.dataset.nav === current)
    );
  }, { passive: true });

  document.getElementById("topBtn")?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy-btn");
    if (!btn) return;
    navigator.clipboard?.writeText(btn.dataset.copy)
      .then(() => showToast("이메일이 복사되었습니다."))
      .catch(() => showToast(btn.dataset.copy));
  });
}

function bindProjectCardClicks() {
  if (document.body.classList.contains("edit-mode")) return;

  document.querySelectorAll(".project-card[data-href]").forEach((card) => {
    if (card.dataset.navBound) return;
    card.dataset.navBound = "1";
    let href = card.dataset.href;
    if (!href || href === "#") return;
    if (CMSNav?.resolveMenuHref) href = CMSNav.resolveMenuHref(href);
    else if (CMSNav?.resolveHref) href = CMSNav.resolveHref(href);
    const go = () => { window.location.href = href; };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  });
}

function bindDynamicInteractions() {
  initStaticInteractions();
  CMS.initReveal?.();
  bindProjectCardClicks();
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("is-show");
  setTimeout(() => toast.classList.remove("is-show"), 2200);
}

// 공개 API — 다른 페이지/모듈에서 부분 렌더 호출
window.PortfolioRender = {
  updateHeader, updateHero, updateAbout, updateCareer, updateSkills,
  updateEducation, updateProjects, updateExperience, updateTraining,
  updateCertificates, updateAwards, updateContact, updateFooter,
  esc, sortByOrder, renderProjectCard, bindProjectCardClicks,
};
