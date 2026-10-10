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
  cursor.innerHTML = `
    <svg class="cursor__shape" viewBox="0 0 11 11">
      <polyline class="cursor__corner" style="--x:-1;--y:-1" points="0.5,5.5 0.5,0.5 5.5,0.5"/>
      <polyline class="cursor__corner" style="--x:1;--y:-1" points="5.5,0.5 10.5,0.5 10.5,5.5"/>
      <polyline class="cursor__corner" style="--x:1;--y:1" points="10.5,5.5 10.5,10.5 5.5,10.5"/>
      <polyline class="cursor__corner" style="--x:-1;--y:1" points="5.5,10.5 0.5,10.5 0.5,5.5"/>
    </svg>`;
  document.body.append(cursor);
  root.classList.add("has-cursor");

  // Inverting works wherever the surface is clearly light or dark, but the
  // inverse of a mid-grey is another mid-grey. Pictures are the only place
  // that happens, so the patch of image under the pointer is averaged into a
  // single pixel and its brightness read back.
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const ink = probe.getContext("2d", { willReadFrequently: true });

  function brightnessUnder(target, x, y) {
    if (!(target instanceof HTMLImageElement) || !target.complete || !target.naturalWidth) return null;

    const box = target.getBoundingClientRect();
    const scale = target.naturalWidth / box.width;
    const patch = 12 * scale;

    try {
      ink.clearRect(0, 0, 1, 1);
      ink.drawImage(
        target,
        (x - box.left) * scale - patch / 2, (y - box.top) * scale - patch / 2, patch, patch,
        0, 0, 1, 1
      );
      const [red, green, blue, alpha] = ink.getImageData(0, 0, 1, 1).data;
      // Mostly transparent: the page shows through, and that inverts fine.
      if (alpha < 128) return null;
      return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    } catch {
      // An image from another origin cannot be read back; inversion stays.
      return null;
    }
  }

  addEventListener("mousemove", (event) => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;

    // In the murky middle, stop inverting and take whichever of black or
    // white stands out more.
    const brightness = brightnessUnder(event.target, event.clientX, event.clientY);
    const murky = brightness !== null && brightness > 0.28 && brightness < 0.72;
    cursor.classList.toggle("is-solid", murky);
    if (murky) cursor.style.setProperty("--cursor-ink", brightness > 0.5 ? "#000" : "#fff");

    cursor.classList.add("is-visible");
    cursor.classList.toggle("is-over", Boolean(event.target.closest("a, button")));
  }, { passive: true });

  // Leaving the window would otherwise park the square on the edge.
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
}

// The photo answers the pointer the way a tvOS poster answers the remote.
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const photo = document.querySelector(".head__photo");
  const shine = document.createElement("span");
  shine.className = "head__shine";
  photo.append(shine);

  const MAX_TILT = 6.5;

  photo.addEventListener("mousemove", (event) => {
    // Measured on the link: unlike the picture, it is never tilted, so the
    // reading does not drift as the picture leans.
    const box = photo.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));

    // The side under the pointer sinks, as if pressed.
    photo.style.setProperty("--tilt-x", `${(0.5 - y) * 2 * MAX_TILT}deg`);
    photo.style.setProperty("--tilt-y", `${(x - 0.5) * 2 * MAX_TILT}deg`);
    photo.style.setProperty("--glare-x", `${x * 100}%`);
    photo.style.setProperty("--glare-y", `${y * 100}%`);
    photo.classList.add("is-lit");
  });

  photo.addEventListener("mouseleave", () => {
    photo.classList.remove("is-lit");
    photo.style.setProperty("--tilt-x", "0deg");
    photo.style.setProperty("--tilt-y", "0deg");
  });
}

// Hovering the logo makes it write itself again, the way it does on the
// opening veil: a pen runs along each letter's skeleton and the outline shows
// through where it has passed. The image is swapped for an inline copy so the
// strokes can be animated; if the file cannot be read the image simply stays.
(async () => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const image = document.querySelector(".head__logo");
  let outline;
  try {
    const file = await (await fetch(image.src)).text();
    outline = new DOMParser().parseFromString(file, "image/svg+xml").querySelector("path").getAttribute("d");
  } catch {
    return;
  }

  // [skeleton, seconds to draw, seconds before it starts] — one line at a time.
  const strokes = [
    ["M78 114H11V11H52C66 11 74 21 74 35C74 49 66 59 52 59H11", 0.459, 0.000],
    ["M52 59C70 59 77.500 72 77.500 86C77.500 101 68 114 55 114", 0.113, 0.459],
    ["M82 127L97 58L115 12L157 127", 0.334, 0.572],
    ["M157 127V11H190C205 11 214.500 23 214.500 40C214.500 57 205 69 190 69H157", 0.368, 0.906],
    ["M190 69L221 127", 0.091, 1.274],
    ["M218 127L260 12L301 127", 0.337, 1.365],
    ["M301 127V11L380 114V-2", 0.498, 1.702]
  ];

  const holder = document.createElement("div");
  holder.innerHTML = `
    <svg class="head__logo" viewBox="0 0 392 126" role="img" aria-label="BARAN">
      <defs>
        <mask id="head-pen" maskUnits="userSpaceOnUse" x="-20" y="-20" width="432" height="166">
          ${strokes.map(([d, time, start]) =>
            `<path class="repen" pathLength="1" style="--d:${time}s;--t:${start}s" d="${d}"/>`).join("")}
          <rect class="repen-seal" x="-20" y="-20" width="432" height="166"/>
        </mask>
      </defs>
      <path mask="url(#head-pen)" fill-rule="evenodd" clip-rule="evenodd" d="${outline}"/>
    </svg>`;
  const logo = holder.firstElementChild;
  image.replaceWith(logo);

  const last = strokes[strokes.length - 1];
  const SPEED = 0.5;
  let writing = null;

  logo.closest("a").addEventListener("mouseenter", () => {
    if (writing) return;
    logo.classList.add("is-writing");
    writing = setTimeout(() => {
      logo.classList.remove("is-writing");
      writing = null;
    }, (last[1] + last[2]) * SPEED * 1000 + 80);
  });
})();
