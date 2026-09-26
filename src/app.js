import { W, H, LOOP, makeCanvas } from "./engine/core.js";
import { createDisplay } from "./engine/display.js";
import { savePNG } from "./engine/save.js";
import { createPlayer } from "./audio/player.js";
import { FOCUS_PRESETS, SLEEP_MINUTES, startFocus, advanceFocus, skipPhase, startSleep, sleepStep, countdown } from "./audio/timers.js";
import scene from "./scene/east-passage.js";
import { SITE_HOST, PERSON_NAME, SITE_BLURB, TIME_ZONE, pageTitle } from "./content/site.js";
import { projects } from "./content/projects.js";
import { thoughts } from "./content/thoughts.js";

const $ = (sel) => document.querySelector(sel);
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem("downeast:" + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("downeast:" + k, JSON.stringify(v));
    } catch {
      /* unavailable */
    }
  },
};

const display = createDisplay($("#screen"));
addEventListener("resize", display.resize);
display.resize();

const [buf, ctx] = makeCanvas(W, H);
const { render } = scene.create(ctx);
const clock0 = performance.now();
const sceneTime = () => (performance.now() - clock0) / 1000;
const loopTime = () => sceneTime() % LOOP;

const audio = createPlayer();
audio.setScene(scene, sceneTime);

document.documentElement.style.setProperty("--accent", scene.accent);
$("#cityName").textContent = scene.name;
$("#tagline").textContent = scene.tagline;

const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
function tickClock() {
  $("#cityTime").textContent = `${timeFmt.format(new Date())} local time`;
}
tickClock();
setInterval(tickClock, 10000);

function frame() {
  render(loopTime());
  display.present(buf, scene.focusX);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const musicVol = $("#musicVol");
const ambVol = $("#ambVol");
musicVol.value = store.get("musicVol", 0.8);
ambVol.value = store.get("ambVol", 0.6);
audio.setMusicVolume(+musicVol.value);
audio.setAmbienceVolume(+ambVol.value);
const savedTrims = store.get("trims", {});
for (const [id, v] of Object.entries(savedTrims)) audio.setSoundTrim(id, v);
const savedVibe = store.get("vibe", { energy: "balanced", band: "full" });
audio.setVibe(savedVibe);
for (const el of document.querySelectorAll("#vibe [name=energy]")) el.checked = el.value === savedVibe.energy;
for (const el of document.querySelectorAll("#vibe [name=band]")) el.checked = el.value === savedVibe.band;

let muted = false;
let preMute = { m: +musicVol.value, a: +ambVol.value };

function startMusic() {
  if (audio.state === "locked" || audio.state === "interrupted") audio.unlock();
  else if (audio.state === "paused") audio.play();
}

$("#play").addEventListener("click", () => {
  startMusic();
  audio.toggle();
});
$("#next").addEventListener("click", () => {
  startMusic();
  audio.next();
});
musicVol.addEventListener("input", () => {
  muted = false;
  audio.setMusicVolume(+musicVol.value);
  store.set("musicVol", +musicVol.value);
});
ambVol.addEventListener("input", () => {
  muted = false;
  audio.setAmbienceVolume(+ambVol.value);
  store.set("ambVol", +ambVol.value);
});

function toggleMute() {
  if (!muted) {
    preMute = { m: +musicVol.value, a: +ambVol.value };
    musicVol.value = 0;
    ambVol.value = 0;
    muted = true;
  } else {
    musicVol.value = preMute.m;
    ambVol.value = preMute.a;
    muted = false;
  }
  audio.setMusicVolume(+musicVol.value);
  audio.setAmbienceVolume(+ambVol.value);
  $("#mute").classList.toggle("on", muted);
}
$("#mute").addEventListener("click", toggleMute);

audio.on("state", (s) => {
  const playing = s === "playing" || s === "starting";
  $("#play").classList.toggle("pulse", s === "locked");
  const icon = playing ? "i-pause" : "i-play";
  $("#play").innerHTML = `<svg><use href="#${icon}"/></svg>`;
  $("#play").setAttribute("aria-label", playing ? "Pause" : "Play music");
});
audio.on("track", (info) => {
  if (!info) return;
  $("#trackTitle").textContent = info.title;
  $("#trackMeta").textContent = `${info.artist} · ${info.key} · ${info.bpm} bpm`;
  renderQueue();
});
audio.on("queue", renderQueue);

function fmtDur(sec) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function renderQueue() {
  const list = $("#queueList");
  const q = audio.queue;
  if (!q.length) {
    list.innerHTML = `<li class="q-empty">play to fill the queue</li>`;
    return;
  }
  list.innerHTML = q
    .map(
      (t, i) =>
        `<li><button type="button" class="pop-item" data-id="${t.id}"><span class="q-n">${i + 1}</span><span class="pop-text"><span class="pop-title">${t.title}</span><span class="pop-meta">${t.key} · ${t.bpm} bpm</span></span><span class="q-dur">${fmtDur(t.duration)}</span></button></li>`,
    )
    .join("");
  list.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      startMusic();
      audio.next(+b.dataset.id);
      closePops();
    });
  });
}

const pops = {
  queue: { el: $("#queue"), btn: $("#queueBtn") },
  vibe: { el: $("#vibe"), btn: $("#vibeBtn") },
  timers: { el: $("#timers"), btn: $("#timerBtn") },
  mixer: { el: $("#mixer"), btn: $("#mixerBtn") },
};
function closePops(except) {
  for (const [k, p] of Object.entries(pops)) {
    if (k === except) continue;
    p.el.hidden = true;
    p.btn.setAttribute("aria-expanded", "false");
  }
}
function togglePop(name) {
  const open = !pops[name].el.hidden;
  closePops();
  if (open) return;
  document.body.classList.remove("ui-off");
  pops[name].el.hidden = false;
  pops[name].btn.setAttribute("aria-expanded", "true");
  if (name === "mixer") renderMixer();
  if (name === "timers") renderTimers();
}
$("#queueBtn").addEventListener("click", () => togglePop("queue"));
$("#vibeBtn").addEventListener("click", () => togglePop("vibe"));
$("#timerBtn").addEventListener("click", () => togglePop("timers"));
$("#mixerBtn").addEventListener("click", () => togglePop("mixer"));

$("#vibe").addEventListener("change", () => {
  const energy = $("#vibe [name=energy]:checked").value;
  const band = $("#vibe [name=band]:checked").value;
  const v = { energy, band };
  audio.setVibe(v);
  store.set("vibe", v);
});

function renderMixer() {
  const list = $("#mixList");
  const sounds = audio.sounds;
  let html = "";
  let lastKind = "";
  for (const s of sounds) {
    const v = savedTrims[s.id] ?? 1;
    const sep = lastKind && lastKind !== s.kind ? " mix-sep" : "";
    lastKind = s.kind;
    html += `<div class="mix-row${sep}${v !== 1 ? " changed" : ""}" data-id="${s.id}"><span class="mix-name">${s.name}</span><input type="range" min="0" max="2" step="0.01" value="${v}" aria-label="${s.name}"><span class="mix-val">${Math.round(v * 100)}%</span></div>`;
  }
  list.innerHTML = html || `<p class="q-empty">no harbor sounds yet</p>`;
  list.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest(".mix-row");
      const id = row.dataset.id;
      const v = +input.value;
      audio.setSoundTrim(id, v);
      savedTrims[id] = v;
      store.set("trims", savedTrims);
      row.querySelector(".mix-val").textContent = `${Math.round(v * 100)}%`;
      row.classList.toggle("changed", v !== 1);
      $("#mixReset").disabled = !Object.values(savedTrims).some((x) => x !== 1);
    });
  });
  $("#mixReset").disabled = !Object.values(savedTrims).some((x) => x !== 1);
}
$("#mixReset").addEventListener("click", () => {
  for (const s of audio.sounds) {
    audio.setSoundTrim(s.id, 1);
    savedTrims[s.id] = 1;
  }
  store.set("trims", savedTrims);
  renderMixer();
});

let focus = null;
let sleep = null;
function renderTimers() {
  const fRow = $("#focusRow");
  fRow.innerHTML = FOCUS_PRESETS.map(
    (p) =>
      `<button type="button" class="t-opt" data-focus="${p.id}" aria-pressed="${focus && focus.preset.id === p.id}">${p.id}</button>`,
  ).join("") + `<button type="button" class="t-opt t-act" data-skip ${focus ? "" : "hidden"}>skip</button><button type="button" class="t-opt t-act" data-stop-focus ${focus ? "" : "hidden"}>stop</button>`;
  fRow.querySelectorAll("[data-focus]").forEach((b) => {
    b.addEventListener("click", () => {
      const preset = FOCUS_PRESETS.find((p) => p.id === b.dataset.focus);
      focus = startFocus(preset);
      renderTimers();
      updatePills();
    });
  });
  fRow.querySelector("[data-skip]")?.addEventListener("click", () => {
    focus = skipPhase(focus);
    renderTimers();
    updatePills();
  });
  fRow.querySelector("[data-stop-focus]")?.addEventListener("click", () => {
    focus = null;
    renderTimers();
    updatePills();
  });
  const sRow = $("#sleepRow");
  sRow.innerHTML = SLEEP_MINUTES.map(
    (m) =>
      `<button type="button" class="t-opt" data-sleep="${m}" aria-pressed="${sleep && sleep.minutes === m}">${m}</button>`,
  ).join("") + `<button type="button" class="t-opt t-act" data-stop-sleep ${sleep ? "" : "hidden"}>off</button>`;
  sRow.querySelectorAll("[data-sleep]").forEach((b) => {
    b.addEventListener("click", () => {
      const minutes = +b.dataset.sleep;
      sleep = startSleep(minutes);
      audio.fadeOut(minutes * 60);
      renderTimers();
      updatePills();
    });
  });
  sRow.querySelector("[data-stop-sleep]")?.addEventListener("click", () => {
    sleep = null;
    renderTimers();
    updatePills();
  });
}
renderTimers();

function updatePills() {
  const pf = $("#pillFocus");
  const ps = $("#pillSleep");
  pf.textContent = focus ? `${countdown(focus.endsAt - Date.now())} ${focus.phase}` : "";
  ps.textContent = sleep ? `${countdown(sleep.endsAt - Date.now())} sleep` : "";
  $("#timerPill").hidden = !focus && !sleep;
  $("#timerBtn").classList.toggle("on", Boolean(focus || sleep));
}
$("#timerPill").addEventListener("click", () => togglePop("timers"));
setInterval(() => {
  const now = Date.now();
  if (focus) {
    const next = advanceFocus(focus, now);
    if (next.cue) audio.cue(next.cue);
    focus = next.focus;
  }
  const sl = sleepStep(sleep, now);
  sleep = sl.sleep;
  updatePills();
}, 500);

$("#saveBtn").addEventListener("click", () => {
  render(loopTime());
  savePNG(buf, "downeast-east-passage");
});

function toggleFS() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    if (req) Promise.resolve(req.call(document.documentElement)).catch(() => {});
  }
}
if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) $("#fs").hidden = true;
$("#fs").addEventListener("click", toggleFS);
$("#screen").addEventListener("dblclick", toggleFS);

let idleTimer = 0;
const canHover = matchMedia("(hover: hover)");
function popOpen() {
  return Object.values(pops).some((p) => !p.el.hidden);
}
function wake() {
  document.body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const busy =
      (canHover.matches && document.querySelector(".ui:hover")) ||
      document.activeElement?.matches("input") ||
      popOpen() ||
      about.open ||
      sheet.open;
    if (busy) wake();
    else document.body.classList.add("idle");
  }, 3500);
}
for (const ev of ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"]) {
  addEventListener(ev, wake, { passive: true });
}
wake();

const about = $("#about");
const sheet = $("#sheet");
const tabs = [...about.querySelectorAll("[role=tab]")];
about.classList.add("tabbed");
if (!projects.length) $("#about-tab-projects").hidden = true;
if (!thoughts.length) {
  $("#about-tab-thoughts").hidden = true;
  $("#projectsLink")?.removeAttribute("data-thoughts");
}
if (!projects.length) $("#projectsLink").hidden = true;

function selectTab(tab) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  }
  $(".about-body").scrollTop = 0;
}
selectTab(tabs[0]);
$(".about-tabs").addEventListener("click", (e) => {
  const tab = e.target.closest("[role=tab]");
  if (tab && !tab.hidden) selectTab(tab);
});

$("#projectList").innerHTML = projects
  .map((p) => {
    const year = `<span>${p.year}</span>`;
    const title = p.kind === "link" ? `<a href="${p.url}" target="_blank" rel="noopener">${p.title}</a>` : `<b>${p.title}</b>`;
    return `<li>${title}${year}<p>${p.summary}</p></li>`;
  })
  .join("");
if (!thoughts.length) $("#thoughtList").innerHTML = `<p>Nothing here yet.</p>`;
else {
  $("#thoughtList").innerHTML = [...thoughts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => `<article><h3>${t.title}</h3><p>${t.date}</p><p>${t.body}</p></article>`)
    .join("");
}

function toggleAbout() {
  if (about.open) {
    about.close();
    return;
  }
  closePops();
  about.showModal();
}
$("#info").addEventListener("click", toggleAbout);
about.addEventListener("click", (e) => {
  if (e.target === about || e.target.closest("[data-close]")) about.close();
});
sheet.addEventListener("click", (e) => {
  if (e.target === sheet || e.target.closest("[data-close]")) closeSheet();
});

function openSheet(kind) {
  closePops();
  if (kind === "projects") {
    $("#sheetTitle").textContent = "Projects";
    $("#sheetBody").innerHTML = $("#about-projects").innerHTML;
    document.title = pageTitle("projects");
  } else if (kind === "thoughts") {
    $("#sheetTitle").textContent = "Thoughts";
    $("#sheetBody").innerHTML = $("#about-thoughts").innerHTML;
    document.title = pageTitle("thoughts");
  } else {
    return;
  }
  if (!sheet.open) sheet.showModal();
}
function closeSheet() {
  if (sheet.open) sheet.close();
  if (location.pathname !== "/") history.pushState({}, "", "/");
  document.title = pageTitle("home");
}

function routeFromLocation() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/projects" && projects.length) openSheet("projects");
  else if (path === "/thoughts") openSheet("thoughts");
  else {
    if (sheet.open) sheet.close();
    document.title = pageTitle("home");
  }
}
$("#projectsLink").addEventListener("click", (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  history.pushState({}, "", "/projects");
  openSheet("projects");
});
addEventListener("popstate", routeFromLocation);
routeFromLocation();

addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || (e.target instanceof Element && e.target.matches("textarea, input:not([type=range])"))) return;
  if (e.target instanceof Element && e.target.matches("input[type=range]") && /^(Arrow|Page|Home$|End$)/.test(e.key)) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (about.open || sheet.open) {
    if (k === "Escape") {
      about.close();
      closeSheet();
    }
    return;
  }
  if (k === "?" || k === "i") {
    if (!e.repeat) toggleAbout();
    return;
  }
  if (k === " ") {
    e.preventDefault();
    $("#play").click();
  } else if (k === "n") {
    startMusic();
    audio.next();
  } else if (k === "q") togglePop("queue");
  else if (k === "a") togglePop("mixer");
  else if (k === "v") togglePop("vibe");
  else if (k === "t") togglePop("timers");
  else if (k === "m") toggleMute();
  else if (k === "f") toggleFS();
  else if (k === "h") document.body.classList.toggle("ui-off");
  else if (k === "s" && !e.repeat) {
    render(loopTime());
    savePNG(buf, "downeast-east-passage");
  } else if (k === "Escape") closePops();
});
