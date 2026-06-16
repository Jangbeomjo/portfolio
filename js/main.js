(function () {
  const { profile, education, skills, techStack, projects, activities } = PORTFOLIO;

  document.getElementById("aboutText").textContent = profile.intro;
  document.getElementById("heroIntro").textContent = profile.intro;
  document.getElementById("heroTaglineEn").textContent = profile.taglineEn;

  document.getElementById("eduCompact").innerHTML = education
    .map(
      (e) => `<li>
        <time>${e.period}</time>
        <p>${e.title}</p>
      </li>`
    )
    .join("");

  document.getElementById("eduTimeline").innerHTML = education
    .map(
      (e) => `<li>
        <time>${e.period}</time>
        <div><strong>${e.title}</strong><p>${e.desc}</p></div>
      </li>`
    )
    .join("");

  document.getElementById("skillBars").innerHTML = skills
    .map(
      (s) => `<div class="skill-bar">
        <div class="skill-bar__label"><span>${s.name}</span><span>${s.stack}</span></div>
        <div class="skill-bar__track"><div class="skill-bar__fill" style="--w:${s.level}%"></div></div>
      </div>`
    )
    .join("");

  document.getElementById("techCloud").innerHTML = techStack
    .map((t) => `<span class="tech-tag">${t}</span>`)
    .join("");

  document.getElementById("projectGrid").innerHTML = projects
    .map(
      (p) => `<article class="project-card" data-href="${p.href}" tabindex="0" role="link">
        <div class="project-card__thumb project-card__thumb--${p.thumb}"></div>
        <div class="project-card__body">
          <div class="project-card__meta">
            <h3>${p.title}</h3>
            <a class="project-card__gh" href="${p.github}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗</a>
          </div>
          <time>${p.period}</time>
          <small>${p.type}</small>
          <p>${p.desc}</p>
          <div class="project-card__tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
        </div>
      </article>`
    )
    .join("");

  document.getElementById("activityGrid").innerHTML = activities
    .map(
      (a) => `<div class="activity-card">
        <time>${a.period}</time>
        <p>${a.title}</p>
        <small>${a.sub}</small>
      </div>`
    )
    .join("");

  const header = document.getElementById("header");
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector(".nav-mobile");
  const navLinks = document.querySelectorAll("[data-nav]");
  const sections = document.querySelectorAll("section[id]");

  window.addEventListener("scroll", () => {
    header.classList.toggle("is-scrolled", window.scrollY > 40);

    let current = "";
    sections.forEach((sec) => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.nav === current);
    });
  });

  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(open));
    mobileNav.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("menu-open");
      document.body.style.overflow = "";
    });
  });

  document.querySelectorAll(".project-card[data-href]").forEach((card) => {
    const go = () => { window.location.href = card.dataset.href; };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });

  const toast = document.getElementById("toast");
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        showToast("이메일이 복사되었습니다.");
      } catch {
        showToast(btn.dataset.copy);
      }
    });
  });

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-show");
    setTimeout(() => toast.classList.remove("is-show"), 2200);
  }

  document.getElementById("topBtn").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
  );
  reveals.forEach((el) => observer.observe(el));
})();
