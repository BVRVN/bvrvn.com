const word = document.querySelector(".head__word");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Bumped on every request so a run started earlier bails out instead of
// fighting the newer one for the same element.
let typingRun = 0;

async function retype(next) {
  const run = ++typingRun;
  const current = word.textContent;
  typing = true;
  showCaret();

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
    if (run === typingRun) {
      typing = false;
      showCaret();
    }
  }
}

// The caret blinks while the name is being retyped, and also as soon as the
// pointer rests on a link to another page: the name is about to be edited.
let typing = false;
let aboutToType = false;

function showCaret() {
  word.classList.toggle("is-typing", typing || aboutToType);
}

for (const link of document.querySelectorAll(".sections__item")) {
  link.addEventListener("mouseenter", () => { aboutToType = true; showCaret(); });
  link.addEventListener("mouseleave", () => { aboutToType = false; showCaret(); });
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

function switchTheme() {
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
}

let themeTurns = 0;

themeButton.addEventListener("click", () => {
  // The half-filled disc flips over with every press.
  themeTurns += 1;
  root.style.setProperty("--theme-turn", `${themeTurns * 180}deg`);

  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    switchTheme();
    return;
  }

  // The new appearance spreads out of the button as a growing circle, sized
  // to reach the corner of the window farthest from it.
  const box = themeButton.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  root.style.setProperty("--wipe-x", `${x}px`);
  root.style.setProperty("--wipe-y", `${y}px`);
  root.style.setProperty("--wipe-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);

  root.classList.add("is-wiping");
  // The browser skips the animation when the tab is in the background; the
  // appearance has still changed, so that is not an error worth reporting.
  document.startViewTransition(switchTheme).finished
    .catch(() => {})
    .finally(() => root.classList.remove("is-wiping"));
});

const track = document.querySelector(".progress");
const thumb = document.querySelector(".progress__thumb");

// On the landing page the large photo folds back to its reduced size over
// the first half-screen of scrolling, so further down it sits exactly as it
// does on the other pages.
const isHome = document.body.classList.contains("is-home");
const FOLD_KEY = "photo-fold";
let folded = 0;

const intro = document.querySelector(".head__intro");
const header = document.querySelector(".head");

function foldPhoto() {
  if (!isHome) return;
  const small = parseFloat(getComputedStyle(root).getPropertyValue("--grow-from"));
  folded = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.5)));
  root.style.setProperty("--fold", String(1 - folded * (1 - small)));

  slideUnderHeader();
}

// The name and its line scroll with the page and pass beneath the header.
// The header inverts whatever is under it, so letters crossing letters would
// tangle; instead the name is hidden exactly where the header's own letters
// are, leaving those drawn cleanly on top, as if the name ran under them.
// That stencil is a picture of the header's letters, redrawn only when the
// layout changes, and slid against the name as the page scrolls.
const underHeader = isHome ? [...document.querySelectorAll(".head__name, .head__about")] : [];

// Draws the header's letters with `pen` exactly where they sit on screen, and
// returns each letter's box: the logo cut at the joins between its five
// letters, the words one character at a time, the button as its disc.
const LOGO_JOINS = [0, 82, 157, 220, 301, 392];

function drawHeaderLetters(pen) {
  const letters = [];

  const logo = document.querySelector(".head__logo:not(.head__strip)");
  const box = logo.getBoundingClientRect();
  pen.drawImage(logo, box.left, box.top, box.width, box.height);
  for (let index = 0; index < LOGO_JOINS.length - 1; index++) {
    letters.push({
      left: box.left + (LOGO_JOINS[index] / 392) * box.width,
      right: box.left + (LOGO_JOINS[index + 1] / 392) * box.width,
      top: box.top,
      bottom: box.bottom,
    });
  }

  for (const label of document.querySelectorAll(".head__word, .sections__item")) {
    const node = label.firstChild;
    const text = label.textContent;
    if (!node || !text) continue;
    const style = getComputedStyle(label);
    pen.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ("letterSpacing" in pen) pen.letterSpacing = style.letterSpacing;
    const range = document.createRange();
    range.selectNodeContents(label);
    const area = range.getBoundingClientRect();
    const size = pen.measureText(text);
    const tall = size.fontBoundingBoxAscent + size.fontBoundingBoxDescent;
    const baseline = area.top + (area.height - tall) / 2 + size.fontBoundingBoxAscent;
    pen.fillText(text, area.left, baseline);
    for (let index = 0; index < text.length; index++) {
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const glyph = range.getBoundingClientRect();
      letters.push({
        left: glyph.left,
        right: glyph.right,
        top: baseline - size.actualBoundingBoxAscent,
        bottom: baseline + size.actualBoundingBoxDescent,
      });
    }
  }

  const button = document.querySelector(".theme__icon").getBoundingClientRect();
  pen.beginPath();
  pen.arc(button.left + button.width / 2, button.top + button.height / 2, button.width / 2, 0, Math.PI * 2);
  pen.fill();
  letters.push(button);

  return letters;
}

// A faint shadow under a header letter, drawn only for the letters something
// is passing under. Every letter's shadow is drawn once, ahead of time; while
// scrolling, the ones being crossed are simply copied onto a sheet laid over
// the page, just beneath the header.
const SHADOW = { offset: 1, blur: 1.5, color: "rgba(0, 0, 0, 0.2)", reach: 4 };
let shadows = null;
let headerLetters = [];
const shadowSheet = isHome ? document.createElement("canvas") : null;
if (shadowSheet) {
  shadowSheet.className = "head__shadows";
  shadowSheet.setAttribute("aria-hidden", "true");
  document.querySelector(".head__intro").after(shadowSheet);
}

function drawHeaderStencil() {
  if (!underHeader.length) return;
  const ratio = devicePixelRatio || 1;
  const sheet = () => {
    const canvas = document.createElement("canvas");
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    const pen = canvas.getContext("2d");
    pen.scale(ratio, ratio);
    return [canvas, pen];
  };

  // The stencil: opaque everywhere but the letters, which are punched out
  // to their exact shape; any wider and the name would leave an empty
  // outline around them as it passes.
  const [stencil, cut] = sheet();
  cut.fillRect(0, 0, innerWidth, innerHeight);
  cut.globalCompositeOperation = "destination-out";
  headerLetters = drawHeaderLetters(cut);

  // The shadows: the letters drawn with a soft shadow, then the letters
  // themselves removed so only the shade around them is left.
  const [shade, pen] = sheet();
  pen.shadowColor = SHADOW.color;
  pen.shadowBlur = SHADOW.blur * ratio;
  pen.shadowOffsetY = SHADOW.offset * ratio;
  drawHeaderLetters(pen);
  pen.shadowColor = "transparent";
  pen.globalCompositeOperation = "destination-out";
  drawHeaderLetters(pen);
  shadows = shade;

  shadowSheet.width = innerWidth * ratio;
  shadowSheet.height = innerHeight * ratio;

  const picture = `url(${stencil.toDataURL()})`;
  for (const part of underHeader) {
    part.style.webkitMaskImage = part.style.maskImage = picture;
    part.style.webkitMaskSize = part.style.maskSize = `${innerWidth}px ${innerHeight}px`;
    part.style.webkitMaskRepeat = part.style.maskRepeat = "no-repeat";
  }
  slideUnderHeader();
}

const measure = document.createElement("canvas").getContext("2d");

// The boxes the ink of an element actually covers: pictures whole, and each
// run of text cut down to its letters' real height, not the taller box the
// browser keeps around a line.
function inkBoxes(root) {
  const boxes = [];
  for (const picture of root.querySelectorAll("img:not(.head__strip), svg")) {
    boxes.push(picture.getBoundingClientRect());
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (!text) continue;
    const style = getComputedStyle(node.parentElement);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const size = measure.measureText(style.textTransform === "uppercase" ? text.toUpperCase() : text);
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const line of range.getClientRects()) {
      const baseline = line.top + (line.height - size.fontBoundingBoxAscent - size.fontBoundingBoxDescent) / 2 + size.fontBoundingBoxAscent;
      boxes.push({
        left: line.left,
        right: line.right,
        top: baseline - size.actualBoundingBoxAscent,
        bottom: baseline + size.actualBoundingBoxDescent,
      });
    }
  }
  return boxes;
}

const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function slideUnderHeader() {
  // The stencil stays put on screen while the name moves beneath it.
  const inks = underHeader.flatMap((part) => {
    const at = part.getBoundingClientRect();
    part.style.webkitMaskPosition = part.style.maskPosition = `${-at.left}px ${-at.top}px`;
    return inkBoxes(part);
  });

  if (!shadows) return;
  const ratio = devicePixelRatio || 1;
  const sheet = shadowSheet.getContext("2d");
  sheet.clearRect(0, 0, shadowSheet.width, shadowSheet.height);
  for (const letter of headerLetters) {
    if (!inks.some((ink) => overlaps(letter, ink))) continue;
    const x = (letter.left - SHADOW.reach) * ratio;
    const y = (letter.top - SHADOW.reach) * ratio;
    const w = (letter.right - letter.left + SHADOW.reach * 2) * ratio;
    const h = (letter.bottom - letter.top + SHADOW.reach * 2) * ratio;
    sheet.drawImage(shadows, x, y, w, h, x, y, w, h);
  }
}

if (underHeader.length) {
  // Once the type has loaded and the page's name has been typed in.
  document.fonts.ready.then(() => setTimeout(drawHeaderStencil, 1200));
  addEventListener("resize", drawHeaderStencil);
}

// The next page shrinks the photo on arrival from here, starting from
// however far scrolling had already folded it.
if (isHome) {
  addEventListener("pagehide", () => {
    try {
      sessionStorage.setItem(FOLD_KEY, root.style.getPropertyValue("--fold") || "1");
    } catch {}
  });
}

function drawProgress() {
  // First, because folding the photo moves the top of the rail.
  foldPhoto();

  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - innerHeight;
  const trackHeight = track.clientHeight;

  // The thumb's length shows how much of the page one screen covers.
  const height = Math.max(26, trackHeight * (innerHeight / doc.scrollHeight));
  const travelled = scrollable > 0 ? scrollY / scrollable : 0;

  thumb.style.height = height + "px";
  thumb.style.transform = `translateY(${(trackHeight - height) * travelled}px)`;

  railAt = travelled;
}

// A new page always opens at its top. If the last one was left part-way
// down, the thumb starts where it was and glides up, instead of snapping.
const RAIL_KEY = "rail-at";
let railAt = 0;

const railWas = (() => {
  try {
    return parseFloat(sessionStorage.getItem(RAIL_KEY)) || 0;
  } catch {
    return 0;
  }
})();

addEventListener("pagehide", () => {
  try {
    sessionStorage.setItem(RAIL_KEY, String(railAt));
  } catch {}
});

drawProgress();

if (railWas > 0.005 && scrollY === 0) {
  const height = parseFloat(thumb.style.height);
  thumb.style.transform = `translateY(${(track.clientHeight - height) * railWas}px)`;
  // Read back so the starting point is committed before the move is set up.
  void thumb.offsetWidth;
  thumb.style.transition = "transform 0.9s cubic-bezier(0.22, 0.75, 0.2, 1)";
  drawProgress();
  // Scrolling must then follow the wheel exactly, with no easing in the way.
  const release = () => { thumb.style.transition = ""; };
  // The swelling inside the thumb has transitions of its own; only the end
  // of the glide itself counts.
  thumb.addEventListener("transitionend", function settled(event) {
    if (event.target !== thumb || event.pseudoElement || event.propertyName !== "transform") return;
    thumb.removeEventListener("transitionend", settled);
    release();
  });
  addEventListener("scroll", release, { once: true, passive: true });
}
addEventListener("scroll", drawProgress, { passive: true });
addEventListener("resize", drawProgress);

// The rail swells while it is in use: under the pointer, while it is being
// dragged, and while the page moves. It lets go as soon as the page stops;
// the short grace only bridges the gap between two wheel events.
let railHovered = false;
let railDragged = false;
let railMoving = null;

function showRailUse() {
  track.classList.toggle("is-active", railHovered || railDragged || railMoving !== null);
}

function markRailMoving() {
  clearTimeout(railMoving);
  railMoving = setTimeout(() => {
    railMoving = null;
    showRailUse();
  }, 120);
  showRailUse();
}

addEventListener("scroll", markRailMoving, { passive: true });

// The page cannot scroll past its ends, but the thumb shows the attempt. It
// is a small weight on a spring: every push against a stop kicks it past, the
// spring pulls it straight back, and it settles after one short rebound. It
// is stepped by hand rather than left to a CSS transition, so it answers on
// the very frame of the push and never lags behind a wheel still coasting.
const SPRING = { stiffness: 620, damping: 30, kick: 2.6, limit: 14, impact: 0.13 };
let railOffset = 0;
let railSpeed = 0;
let railTarget = 0;
let railFrame = null;
let railTick = 0;

function stepRail(now) {
  // Capped so a tab coming back from the background cannot fling it.
  const dt = Math.min(0.032, (now - railTick) / 1000);
  railTick = now;

  const pull = -SPRING.stiffness * (railOffset - railTarget) - SPRING.damping * railSpeed;
  railSpeed += pull * dt;
  railOffset += railSpeed * dt;

  // Soft ceiling: the further out, the less each extra push gains.
  const shown = SPRING.limit * Math.tanh(railOffset / SPRING.limit);
  thumb.dataset.stop = shown > 0 ? "end" : "start";
  thumb.style.setProperty("--push", shown.toFixed(2));

  const resting = Math.abs(railOffset - railTarget) < 0.05 && Math.abs(railSpeed) < 2;
  if (resting && railTarget === 0) {
    railOffset = railSpeed = 0;
    thumb.style.setProperty("--push", "0");
    railFrame = null;
    return;
  }
  railFrame = requestAnimationFrame(stepRail);
}

function wakeRail() {
  if (railFrame !== null) return;
  railTick = performance.now();
  railFrame = requestAnimationFrame(stepRail);
}

// Which end the page is resting against in the direction of `beyond`
// (positive past the bottom, negative past the top), or 0 if neither.
function railSide(beyond) {
  const scrollable = document.documentElement.scrollHeight - innerHeight;
  if (scrollable <= 0) return 0;
  if (beyond > 0 && scrollY >= scrollable - 1) return 1;
  if (beyond < 0 && scrollY <= 0) return -1;
  return 0;
}

// A momentary push, from the wheel: a kick, then the spring takes over.
function kickRail(beyond) {
  if (!railSide(beyond)) return;
  railSpeed += beyond * SPRING.kick;
  markRailMoving();
  wakeRail();
}

// A sustained push, from a drag or a finger: the thumb strains towards it
// for as long as it lasts.
function holdRail(beyond) {
  railTarget = railSide(beyond) ? beyond : 0;
  if (railTarget) markRailMoving();
  wakeRail();
}

function releaseRail() {
  railTarget = 0;
  wakeRail();
}

// Arriving at an end, the page hands the thumb the speed it came in at: a
// slow arrival barely registers, a fast one sends it well past the stop.
let lastScrollY = scrollY;
let lastScrollAt = performance.now();
let wasAtEnd = true;

addEventListener("scroll", () => {
  const now = performance.now();
  const speed = (scrollY - lastScrollY) / Math.max(1, now - lastScrollAt) * 1000;
  lastScrollY = scrollY;
  lastScrollAt = now;

  const atEnd = railSide(speed) !== 0;
  if (atEnd && !wasAtEnd && !railDragged) {
    railSpeed += Math.max(-7000, Math.min(7000, speed)) * SPRING.impact;
    wakeRail();
  }
  wasAtEnd = atEnd;
}, { passive: true });

addEventListener("wheel", (event) => {
  if (event.ctrlKey) return;
  kickRail(event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY);
}, { passive: true });

// On a touch screen the same push comes from a finger still dragging once
// the page has run out.
let touchFrom = null;

addEventListener("touchstart", (event) => { touchFrom = event.touches[0].clientY; }, { passive: true });

addEventListener("touchmove", (event) => {
  if (touchFrom !== null) holdRail((touchFrom - event.touches[0].clientY) * 0.12);
}, { passive: true });

addEventListener("touchend", () => { touchFrom = null; releaseRail(); }, { passive: true });

track.addEventListener("pointerenter", () => { railHovered = true; showRailUse(); });
track.addEventListener("pointerleave", () => { railHovered = false; showRailUse(); });

// Pressing or dragging on the rail scrubs the page, like a media scrubber:
// the thumb's middle goes to the pointer.
function scrubTo(clientY) {
  const box = track.getBoundingClientRect();
  const height = parseFloat(thumb.style.height);
  const along = (clientY - box.top - height / 2) / (box.height - height);
  const scrollable = document.documentElement.scrollHeight - innerHeight;
  scrollTo(0, Math.min(1, Math.max(0, along)) * scrollable);

  // Dragged past an end, the thumb strains after the pointer until released.
  const past = (along < 0 ? along : along > 1 ? along - 1 : 0) * (box.height - height);
  holdRail(past * 0.25);
}

track.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  track.setPointerCapture(event.pointerId);
  railDragged = true;
  showRailUse();
  scrubTo(event.clientY);
});

track.addEventListener("pointermove", (event) => {
  if (railDragged) scrubTo(event.clientY);
});

for (const end of ["pointerup", "pointercancel"]) {
  track.addEventListener(end, () => {
    railDragged = false;
    releaseRail();
    showRailUse();
  });
}

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
    cursor.classList.toggle("is-over", Boolean(event.target.closest("a, button, .progress")));
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

  const MAX_TILT = 4;

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

// The logo's glint starts wherever the pointer first touches it, and the
// letters swell under the pointer for as long as it stays on them.
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const logo = document.querySelector(".head__logo");
  const mark = document.createElement("span");
  mark.className = "head__mark";
  logo.replaceWith(mark);
  mark.append(logo);

  // Thin enough that the stepped edge between two slices cannot be seen.
  const SLICES = 28;
  const strips = Array.from({ length: SLICES }, (_, index) => {
    const strip = logo.cloneNode();
    strip.classList.add("head__strip");
    strip.alt = "";
    const from = (index / SLICES) * 100;
    const to = ((index + 1) / SLICES) * 100;
    // A hair of overlap keeps neighbours from showing a seam.
    strip.style.clipPath = `inset(0 calc(${100 - to}% - 0.4px) 0 calc(${from}% - 0.4px))`;
    strip.style.transformOrigin = `${(from + to) / 2}% 50%`;
    mark.append(strip);
    return strip;
  });

  const link = mark.closest("a");

  // How tall the slice right under the pointer grows, and how far either side
  // the bulge spreads, as a share of the logo's width.
  const SWELL = { height: 0.3, spread: 0.09 };
  let unswell = null;

  link.addEventListener("mousemove", (event) => {
    const box = logo.getBoundingClientRect();
    const x = event.clientX - box.left;
    const spread = box.width * SWELL.spread;
    strips.forEach((strip, index) => {
      const away = ((index + 0.5) / SLICES) * box.width - x;
      strip.style.setProperty("--swell", 1 + SWELL.height * Math.exp(-(away * away) / (2 * spread * spread)));
    });
    clearTimeout(unswell);
    mark.classList.add("is-swelling");
  });

  // Let down gently, then hand back to the real image once flat again.
  link.addEventListener("mouseleave", () => {
    strips.forEach((strip) => strip.style.setProperty("--swell", 1));
    unswell = setTimeout(() => mark.classList.remove("is-swelling"), 200);
  });

  link.addEventListener("mouseenter", (event) => {
    const box = logo.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const room = parseFloat(getComputedStyle(mark).paddingLeft);
    mark.style.setProperty("--glint-x", `${x + room}px`);
    mark.style.setProperty("--glint-y", `${y + room}px`);

    // Dropping the class and reading a layout value restarts the animation
    // if the pointer comes back before the last glint has finished.
    mark.classList.remove("is-glinting");
    void mark.offsetWidth;
    mark.classList.add("is-glinting");
  });

  mark.addEventListener("animationend", (event) => {
    if (event.animationName === "logo-glint") mark.classList.remove("is-glinting");
  });
}
