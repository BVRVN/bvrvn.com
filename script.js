document.getElementById("year").textContent = new Date().getFullYear();

const burger = document.querySelector(".burger");
const drawer = document.getElementById("drawer");

function setDrawer(open) {
  burger.setAttribute("aria-expanded", String(open));
  if (open) {
    drawer.hidden = false;
    // Let the browser paint the hidden state once so the transition runs.
    requestAnimationFrame(() => drawer.classList.add("is-open"));
  } else {
    drawer.classList.remove("is-open");
  }
}

burger.addEventListener("click", () => {
  setDrawer(burger.getAttribute("aria-expanded") !== "true");
});

drawer.addEventListener("transitionend", (event) => {
  if (event.propertyName === "opacity" && !drawer.classList.contains("is-open")) {
    drawer.hidden = true;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setDrawer(false);
});

drawer.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setDrawer(false));
});

const suffix = document.querySelector(".topbar__suffix");

document.querySelectorAll(".menu__item, .drawer__item").forEach((item) => {
  item.addEventListener("click", () => {
    suffix.textContent = item.textContent;
    setDrawer(false);
  });
});
