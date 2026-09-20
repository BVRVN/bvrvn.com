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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Bumped on every request so a run started earlier bails out instead of
// fighting the newer one for the same element.
let typingRun = 0;

async function retype(word) {
  const run = ++typingRun;
  const current = suffix.textContent;
  suffix.classList.add("is-typing");

  for (let i = current.length - 1; i >= 0; i--) {
    if (run !== typingRun) return;
    suffix.textContent = current.slice(0, i);
    await wait(40);
  }

  for (let i = 1; i <= word.length; i++) {
    if (run !== typingRun) return;
    suffix.textContent = word.slice(0, i);
    await wait(70);
  }

  // A newer run owns the caret now, so only the last one clears it.
  if (run === typingRun) {
    await wait(450);
    if (run === typingRun) suffix.classList.remove("is-typing");
  }
}

document.querySelectorAll(".menu__item, .drawer__item").forEach((item) => {
  item.addEventListener("click", () => {
    setDrawer(false);
    if (item.textContent !== suffix.textContent) retype(item.textContent);
  });
});
