// ============================
// ✅ DOM / UI UTILS
// ============================

function isMobile() {
  return window.innerWidth <= 768;
}

function animateView(container, html, direction = "forward") {
  if (!container) return;

  if (!isMobile()) {
    container.innerHTML = html;
    container.classList.remove("hidden");
    return;
  }

  container.classList.remove("hidden");
  container.classList.add("app-view");
  container.innerHTML = html;

  requestAnimationFrame(() => {
    container.classList.remove("view-enter", "view-exit", "view-back-enter");
    container.classList.add(
      direction === "back" ? "view-back-enter" : "view-enter"
    );
  });

  container.scrollIntoView({
    behavior: "smooth"
  });
}

function closeAnimated(container) {
  if (!container) return;

  if (!isMobile()) {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }

  container.classList.add("view-exit");

  setTimeout(() => {
    container.innerHTML = "";
    container.classList.add("hidden");
    container.classList.remove("view-exit");
  }, 180);
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  setTimeout(() => {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 80);
}

function getEl(id) {
  return document.getElementById(id);
}

function getValue(id, fallback = "") {
  const el = document.getElementById(id);
  return el ? el.value : fallback;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

window.PTDomUtils = {
  isMobile,
  animateView,
  closeAnimated,
  scrollToSection,
  getEl,
  getValue,
  setValue,
  setHtml,
  showElement,
  hideElement
};
