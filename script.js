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
