/**
 * 모바일·데스크톱 네비 — file:// · localhost 공통
 */
const CMSNav = (() => {
  let bound = false;

  function isSubPage() {
    const p = location.pathname.replace(/\\/g, "/");
    return /\/pages\//.test(p) || p.endsWith("/pages");
  }

  /** file:// · http 모두 동작하는 절대/상대 URL */
  function resolveHref(path) {
    if (!path || path.startsWith("#")) return path;
    try {
      return new URL(path, location.href).href;
    } catch {
      return path;
    }
  }

  function resolveMenuHref(href) {
    if (!href) return "#";
    const sub = isSubPage();
    const root = sub ? "../" : "./";

    if (href.startsWith("#")) {
      return sub ? resolveHref(`${root}index.html${href}`) : href;
    }
    if (href.startsWith("./pages/")) {
      const page = href.replace("./pages/", "");
      return sub ? resolveHref(page) : resolveHref(href);
    }
    if (href.startsWith("../")) return resolveHref(href);
    return resolveHref(href);
  }

  function navKeyFromHref(href) {
    if (!href) return "";
    if (href.startsWith("#")) return href.slice(1);
    const page = href.replace(/^\.\/pages\//, "").replace(/^\.\.\/pages\//, "");
    if (page.endsWith(".html")) return page.replace(".html", "");
    try {
      const url = new URL(href, location.href);
      const hash = url.hash?.replace("#", "");
      if (hash) return hash;
      const file = url.pathname.split("/").pop() || "";
      return file.replace(".html", "");
    } catch {
      return href.replace(/^\.\//, "").replace(/\.html$/, "");
    }
  }

  function getDefaultMenu() {
    return [
      { label: "ABOUT", href: "#about" },
      { label: "EDUCATION", href: "#education" },
      { label: "SKILLS", href: "#skills" },
      { label: "CAREER", href: "#career" },
      { label: "ACTIVITIES", href: "#activities" },
      { label: "PROJECTS", href: "#projects" },
      { label: "CONTACT", href: "#contact" },
      { label: "RESUME", href: "./pages/resume.html" },
      { label: "DOCUMENTS", href: "./pages/documents.html" },
      { label: "IMAGES", href: "./pages/images.html" },
    ];
  }

  function getDefaultLinks() {
    const sub = isSubPage();
    const root = sub ? "../" : "./";
    return [
      { label: "Home", href: resolveHref(`${root}index.html`) },
      { label: "ABOUT", href: resolveHref(sub ? `${root}index.html#about` : "#about") },
      { label: "Resume", href: resolveHref(sub ? "resume.html" : `${root}pages/resume.html`) },
      { label: "Documents", href: resolveHref(sub ? "documents.html" : `${root}pages/documents.html`) },
      { label: "Images", href: resolveHref(sub ? "images.html" : `${root}pages/images.html`) },
    ];
  }

  function esc(text) {
    const d = document.createElement("div");
    d.textContent = text ?? "";
    return d.innerHTML;
  }

  function markActiveNav() {
    const path = location.pathname.replace(/\\/g, "/");
    const page = path.split("/").pop()?.replace(".html", "") || "index";
    const hash = location.hash?.replace("#", "") || "";

    document.querySelectorAll("[data-nav]").forEach((link) => {
      const key = link.dataset.nav;
      let active = false;
      if (hash && !isSubPage()) active = key === hash;
      else if (isSubPage() && page !== "index") active = key === page;
      link.classList.toggle("is-active", active);
    });
  }

  function renderDesktopNav(profile) {
    const desktop = document.getElementById("navDesktop");
    if (!desktop) return;
    const items = (profile?.menu || []).length ? profile.menu : getDefaultMenu();
    desktop.innerHTML = items.map((item) => {
      const href = resolveMenuHref(item.href || "#");
      const key = navKeyFromHref(item.href || "#");
      return `<a href="${esc(href)}" data-nav="${esc(key)}">${esc(item.label)}</a>`;
    }).join("");
    markActiveNav();
    refreshMobileNav();
  }

  function linksFromDesktop() {
    const desktop = document.getElementById("navDesktop");
    if (!desktop) return null;
    const anchors = [...desktop.querySelectorAll("a")];
    if (!anchors.length) return null;
    return anchors.map((a) => {
      const href = a.getAttribute("href") || "#";
      return {
        label: a.textContent.trim(),
        href: href.startsWith("#") ? href : resolveHref(href),
      };
    });
  }

  function renderLinks(items) {
    return items.map((item) =>
      `<a href="${item.href}">${item.label}</a>`).join("");
  }

  function refreshMobileNav() {
    const mobile = document.getElementById("navMobile");
    if (!mobile) return;
    const items = linksFromDesktop() || getDefaultLinks();
    mobile.innerHTML = `${renderLinks(items)}<div class="nav-mobile-actions" id="navMobileActions"></div>`;
    syncMobileNavActions();
  }

  function syncMobileNavActions() {
    const slot = document.getElementById("navMobileActions");
    const src = document.getElementById("headerActions");
    if (!slot || !src) return;

    slot.innerHTML = "";
    src.querySelectorAll("button, .header-actions__user, .theme-switcher").forEach((el) => {
      const clone = el.cloneNode(true);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      clone.addEventListener("click", (e) => {
        e.preventDefault();
        const preset = e.target.closest("[data-theme-preset]");
        if (preset) {
          ThemeSwitcher?.selectPreset?.(preset.dataset.themePreset);
          return;
        }
        const origToggle = src.querySelector("#themeSwitcherToggle");
        if (e.target.closest(".theme-switcher__toggle") && origToggle) {
          origToggle.click();
          return;
        }
        const origBtn = [...src.querySelectorAll("button")].find((b) => b.textContent === clone.textContent);
        if (origBtn) origBtn.click();
        else el.click();
        closeMenu();
      });
      slot.appendChild(clone);
    });
  }

  function isOpen() {
    return document.body.classList.contains("nav-open");
  }

  function closeMenu() {
    const mobile = document.getElementById("navMobile");
    const toggle = document.querySelector(".nav-toggle");

    if (mobile?.contains(document.activeElement)) {
      document.activeElement?.blur?.();
      toggle?.focus?.();
    }

    document.getElementById("header")?.classList.remove("menu-open");
    mobile?.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    document.body.style.overflow = "";
    toggle?.setAttribute("aria-expanded", "false");
    mobile?.setAttribute("aria-hidden", "true");
  }

  function openMenu(open) {
    const header = document.getElementById("header");
    const toggle = document.querySelector(".nav-toggle");
    const mobile = document.getElementById("navMobile");
    if (!header || !toggle || !mobile) return;

    if (open) {
      refreshMobileNav();
      mobile.removeAttribute("aria-hidden");
    } else {
      closeMenu();
      return;
    }

    header.classList.add("menu-open");
    mobile.classList.add("is-open");
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function toggleMenu() {
    openMenu(!isOpen());
  }

  function bind() {
    if (bound) return;
    bound = true;

    document.addEventListener("click", (e) => {
      if (e.target.closest(".nav-toggle")) {
        e.stopPropagation();
        toggleMenu();
        return;
      }
      const link = e.target.closest("#navMobile a");
      if (link) closeMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) closeMenu();
    });

    window.addEventListener("hashchange", markActiveNav);
  }

  function init() {
    bind();
    refreshMobileNav();
  }

  document.addEventListener("portfolio:ready", () => {
    const profile = window.PortfolioStore?.get?.()?.profile;
    if (profile) renderDesktopNav(profile);
    else refreshMobileNav();
    markActiveNav();
  });
  document.addEventListener("portfolio:rendered", syncMobileNavActions);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    init, refreshMobileNav, syncMobileNavActions, closeMenu, openMenu, toggleMenu,
    resolveHref, resolveMenuHref, renderDesktopNav, markActiveNav, getDefaultMenu,
  };
})();

window.CMSNav = CMSNav;
