const word = document.querySelector(".head__word");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Bumped on every request so a run started earlier bails out instead of
// fighting the newer one for the same element.
let typingRun = 0;

async function retype(next) {
  const run = ++typingRun;
  const current = word.textContent;
  word.classList.add("is-typing");

  for (let i = current.length - 1; i >= 0; i--) {
    if (run !== typingRun) return;
    word.textContent = current.slice(0, i);
    await wait(40);
  }

  for (let i = 1; i <= next.length; i++) {
    if (run !== typingRun) return;
    word.textContent = next.slice(0, i);
    await wait(70);
  }

  // A newer run owns the caret now, so only the last one clears it.
  if (run === typingRun) {
    await wait(450);
    if (run === typingRun) word.classList.remove("is-typing");
  }
}

// Each section is its own page, so the swap happens across a navigation.
// Carrying the previous word over lets the name erase itself and type the
// new one on arrival.
const WORD_KEY = "page-word";

const remembered = (() => {
  try {
    return sessionStorage.getItem(WORD_KEY);
  } catch {
    return null;
  }
})();

const current = word.textContent;

if (remembered !== current) {
  word.textContent = remembered || "";
  retype(current);
}

try {
  sessionStorage.setItem(WORD_KEY, current);
} catch {
  // Private browsing can refuse storage; the name just appears without the effect.
}

const root = document.documentElement;
const themeButton = document.querySelector(".theme");

function showTheme() {
  themeButton.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
}

showTheme();

themeButton.addEventListener("click", () => {
  const dark = root.dataset.theme !== "dark";
  if (dark) {
    root.dataset.theme = "dark";
  } else {
    delete root.dataset.theme;
  }

  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    // Private browsing can refuse storage; the choice just lasts this page.
  }

  showTheme();
});

const track = document.querySelector(".progress");
const thumb = document.querySelector(".progress__thumb");

function drawProgress() {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - innerHeight;
  const trackHeight = track.clientHeight;

  // The thumb's length shows how much of the page one screen covers.
  const height = Math.max(26, trackHeight * (innerHeight / doc.scrollHeight));
  const travelled = scrollable > 0 ? scrollY / scrollable : 0;

  thumb.style.height = height + "px";
  thumb.style.transform = `translateY(${(trackHeight - height) * travelled}px)`;
}

drawProgress();
addEventListener("scroll", drawProgress, { passive: true });
addEventListener("resize", drawProgress);

// A thin square stands in for the pointer. Touch devices never get it: there
// is no pointer to replace, and it would stick wherever the last tap landed.
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.append(cursor);
  root.classList.add("has-cursor");

  addEventListener("mousemove", (event) => {
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    cursor.classList.add("is-visible");
    cursor.classList.toggle("is-over", Boolean(event.target.closest("a, button")));
  }, { passive: true });

  // Leaving the window would otherwise park the square on the edge.
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
}
