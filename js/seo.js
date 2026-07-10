/**
 * SEO 메타 태그 적용
 */
function applySeo(seo, profile) {
  if (!seo) return;
  document.title = seo.title || `${profile?.name} | Portfolio`;
  setMeta("description", seo.description);
  setMeta("keywords", seo.keywords);
  setMeta("robots", seo.robots);
  setMetaProperty("og:title", seo.title);
  setMetaProperty("og:description", seo.description);
  if (seo.ogImage) setMetaProperty("og:image", seo.ogImage);
  if (seo.favicon) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = seo.favicon;
  }
}

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

function setMetaProperty(prop, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
  el.content = content;
}

window.applySeo = applySeo;
