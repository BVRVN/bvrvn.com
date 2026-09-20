document.getElementById("year").textContent = new Date().getFullYear();

const topbar = document.querySelector(".topbar");
const burger = document.querySelector(".burger");
const panel = document.getElementById("panel");

function setPanel(open) {
  burger.setAttribute("aria-expanded", String(open));
  topbar.classList.toggle("is-open", open);

  if (open) {
    panel.style.height = panel.scrollHeight + "px";
  } else {
    // Pin the current height first, otherwise the collapse has no start value
    // to animate from once it has been left on auto.
    panel.style.height = panel.scrollHeight + "px";
    requestAnimationFrame(() => {
      panel.style.height = "0px";
    });
  }
}

// Once expanded, hand the height back to the content so rotating the phone
// or a longer word cannot clip the panel.
panel.addEventListener("transitionend", (event) => {
  if (event.propertyName === "height" && topbar.classList.contains("is-open")) {
    panel.style.height = "auto";
  }
});

burger.addEventListener("click", () => {
  setPanel(burger.getAttribute("aria-expanded") !== "true");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setPanel(false);
});

panel.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setPanel(false));
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

document.querySelectorAll(".menu__item, .panel__item").forEach((item) => {
  item.addEventListener("click", () => {
    setPanel(false);
    if (item.textContent !== suffix.textContent) retype(item.textContent);
  });
});
