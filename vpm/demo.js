/* ===========================================================
 * EVM – Interactive Demo
 * State machine that mirrors main.py's screen flow plus
 * synchronised smart-glass / LED / motor / paper animation.
 *
 * The GUI pane is a 1:1 replica of the 480×800 Tkinter UI:
 * real assets from assets/, real widget geometry, and the
 * same screen sequence (there is NO separate "printing"
 * screen — main.py blocks on print_image() while the confirm
 * screen stays visible).
 *
 * Whether a print is correct or faulty comes from the vote
 * engine (vote-engine.js); timings from settings.js.
 * =========================================================== */

const ASSETS = 'assets';

/* Same files main.py loads from assets/images/ */
const SYMBOLS = ['Bag', 'Bell', 'Bulb', 'Car', 'Clock', 'Coffee', 'Dumbel', 'Fish', 'Glass']
  .map(name => ({ name, img: `${ASSETS}/images/${name}.png` }));
const symbolByName = (name) => SYMBOLS.find(s => s.name === name);

/* ---- session state (a page reload starts a fresh session) ---- */
let settings = KioskSettings.load();
const voteSession = VoteEngine.createSession(SYMBOLS.map(s => s.name));
const voteRecords = voteSession.records;   // in-memory only, never rendered

/* ---- DOM handles ---- */
const $ = (sel) => document.querySelector(sel);
const screens = document.querySelectorAll('.screen');

const topWindow    = $('#topWindow');
const bottomWindow = $('#bottomWindow');
const greenLed     = $('#greenLed');
const redLed       = $('#redLed');
const topMotor     = $('#topMotor');
const bottomMotor  = $('#bottomMotor');
const printYesBtn  = $('#printYesBtn');
const printNoBtn   = $('#printNoBtn');

/* ===========================================================
 * FLOW TIMERS — every pause in a running flow is tracked so
 * navigation can cancel the flow and leave nothing running.
 * =========================================================== */
const flowTimers = new Set();
function pause(seconds) {
  return new Promise(resolve => {
    const id = setTimeout(() => { flowTimers.delete(id); resolve(); }, Math.max(0, seconds) * 1000);
    flowTimers.add(id);
  });
}
function cancelFlow() {
  flowTimers.forEach(clearTimeout);
  flowTimers.clear();     // a cancelled flow never resumes
}

/* ===========================================================
 * SCREEN COUNTDOWNS (mirrors start_timer() in main.py)
 * Real seconds, deadline based, fires onExpire exactly once.
 * =========================================================== */
const SCREEN_TIMERS = {
  'constituency':   { setting: 'constituency',  onExpire: () => goHome() },
  'confirm-symbol': { setting: 'confirmSymbol', onExpire: () => startVote() },
  'confirm-print':  { setting: 'confirmPrint',  onExpire: () => handleTimeout() },
  'thanks':         { setting: 'thanks',        onExpire: () => goHome() },
  'terminated':     { setting: 'terminated',    onExpire: () => goHome() }
};

let screenTimerId = null;
function stopScreenTimer() {
  if (screenTimerId) { clearInterval(screenTimerId); screenTimerId = null; }
}
function startScreenTimer(screenEl, name) {
  stopScreenTimer();
  const cfg   = SCREEN_TIMERS[name];
  const label = screenEl.querySelector('.time-left');
  if (!cfg || !label) return;
  const endAt = Date.now() + settings.timeouts[cfg.setting] * 1000;
  let shown = null;
  const tick = () => {
    const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    if (left !== shown) { shown = left; label.textContent = `Time Left to accept: ${left} seconds`; }
    if (left === 0) { stopScreenTimer(); cfg.onExpire(); }
  };
  tick();
  screenTimerId = setInterval(tick, 200);
}

/* ---- screen helper ---- */
function showScreen(name) {
  screens.forEach(s => s.classList.toggle('active', s.dataset.screen === name));
  const active = document.querySelector(`.screen[data-screen="${name}"]`);
  stopScreenTimer();
  if (active) startScreenTimer(active, name);
}

/* ===========================================================
 * HARDWARE (LEDs, smart glass, motors, paper)
 * =========================================================== */
const windowFor = (side) => side === 'top' ? topWindow : bottomWindow;

function setLed(el, on) { el.classList.toggle('on', !!on); }

function setGlass(side, on) {
  const win = windowFor(side);
  win.classList.toggle('glass-on', on);
  win.classList.toggle('led-on', on);
}
function setMotor(side, on) {
  (side === 'top' ? topMotor : bottomMotor).classList.toggle('on', on);
}

/* Each window holds one continuous paper roll that only ever feeds
 * upward. A print is laid on the roll just below the window, then
 * the roll advances one FEED: the print comes to rest in view and
 * the previous print, with blank paper after it, leaves through the top. */
const ROLL_FEED  = 205;   // print height (165) + blank paper between prints
const PRINT_REST = 12;    // print's resting offset from the top of the window
const ROLL_DASH  = 12;    // period of the centre cut line pattern

const rolls = {
  top:    { el: topWindow.querySelector('.paper-roll'),    pos: 0, seq: 0 },
  bottom: { el: bottomWindow.querySelector('.paper-roll'), pos: 0, seq: 0 }
};

function advanceRoll(roll, seconds) {
  roll.seq++;
  roll.pos += ROLL_FEED;
  roll.el.style.transitionDuration = `${seconds}s`;
  roll.el.style.transform = `translateY(${-roll.pos}px)`;
}

function feedPrint(side, printDef, seconds) {
  const roll = rolls[side];
  const print = document.createElement('div');
  print.className = `roll-print ${printDef.cls || ''}`;
  print.style.top = `${roll.pos + ROLL_FEED + PRINT_REST}px`;
  print.innerHTML = printDef.html;
  roll.el.appendChild(print);
  advanceRoll(roll, seconds);
}

/* Blank roll looks the same after any whole dash period, so once
 * only blank paper is in view the roll is quietly wound back. */
function rewindRoll(roll) {
  roll.el.querySelectorAll('.roll-print').forEach(p => p.remove());
  roll.pos %= ROLL_DASH;
  roll.el.style.transitionDuration = '0s';
  roll.el.style.transform = `translateY(${-roll.pos}px)`;
}

/* feed blank paper until the last print has left the window */
function ejectPrints(side, seconds) {
  const roll = rolls[side];
  if (!roll.el.querySelector('.roll-print')) return;
  advanceRoll(roll, seconds);
  const seq = roll.seq;
  setTimeout(() => { if (roll.seq === seq) rewindRoll(roll); }, seconds * 1000 + 50);
}

const printSymbol    = (sym) => ({ html: `<img class="slip-img" src="${sym.img}" alt=""/>` });
const PRINT_VOTED    = {
  cls: 'voted',
  html: `<div class="barcode-vert"></div><span>VOTED</span><div class="barcode-vert"></div>`
};
const PRINT_REJECTED = { html: `<span>REJECTED</span>` };

/* hardware_default(): glass + LEDs off, motors stopped, paper out */
function hardwareDefault() {
  setLed(greenLed, true);
  setLed(redLed, false);
  ['top', 'bottom'].forEach(side => {
    setMotor(side, false);
    ejectPrints(side, 0.6);
    setGlass(side, false);
  });
}

/* printer selection (mirrors select_printer()) */
function pickPrinter() {
  if (settings.printer === 'TOP')    return 'top';
  if (settings.printer === 'BOTTOM') return 'bottom';
  return Math.random() < 0.5 ? 'top' : 'bottom';
}

/* ===========================================================
 * SYMBOL GRID (grid_screen builds it from assets/images/)
 * =========================================================== */
let currentSymbol = SYMBOLS[3]; // Car

const gridInner = document.querySelector('.grid-inner');
SYMBOLS.forEach(sym => {
  const cell = document.createElement('div');
  cell.className = 'sym-cell';
  cell.innerHTML =
    `<button type="button" class="sym-btn"><img src="${sym.img}" alt="${sym.name}"/></button>` +
    `<div class="sym-name">${sym.name}</div>`;
  cell.querySelector('button').addEventListener('click', () => onSymbolClick(sym));
  gridInner.appendChild(cell);
});

function onSymbolClick(sym) {
  if (busy) return;
  currentSymbol = sym;
  $('#bigSymbol').src = sym.img;
  $('#bigSymbol').alt = sym.name;
  showScreen('confirm-symbol');
}

/* ===========================================================
 * VOTE INTERACTION
 * =========================================================== */
let busy = false;          // a print sequence is running; screen input is ignored
let activeVote = null;     // { scenario, side, finalized }

function setResponseEnabled(on) {
  printYesBtn.disabled = !on;
  printNoBtn.disabled  = !on;
}

/* accept_image(): lock the scenario, then print it */
async function startVote() {
  if (busy || activeVote) return;
  busy = true;

  const scenario = voteSession.generateVoteScenario(currentSymbol.name, settings.faultyPrints);
  const side = pickPrinter();
  activeVote = { scenario, side, finalized: false };
  const t = settings.transitions;

  setLed(greenLed, false);
  setLed(redLed, true);
  setGlass(side, true);
  await pause(t.glassToMotor);

  setMotor(side, true);
  feedPrint(side, printSymbol(symbolByName(scenario.printedImage)), t.symbolFeed);
  await pause(t.symbolFeed);

  setMotor(side, false);
  await pause(t.motorSettle);

  const selected = symbolByName(scenario.selectedImage);
  $('#bigSymbolConfirm').src = selected.img;
  $('#bigSymbolConfirm').alt = selected.name;
  setResponseEnabled(true);
  showScreen('confirm-print');
  busy = false;
}

function handleUserResponse(response) {
  finalizeVote(response);
}
function handleTimeout() {
  finalizeVote('TIMEOUT');
}

/* YES, NO and TIMEOUT all end here; only the first call counts */
function finalizeVote(response) {
  if (!activeVote || activeVote.finalized) return;
  activeVote.finalized = true;
  stopScreenTimer();
  setResponseEnabled(false);

  const record = voteSession.recordVote(activeVote.scenario, response);
  if (record) showResult(record, activeVote.side);
}

/* print VOTED / REJECTED, then the thanks / terminated screen */
async function showResult(record, side) {
  busy = true;
  const accepted = record.decision === 'ACCEPTED';
  const t = settings.transitions;

  setMotor(side, true);
  feedPrint(side, accepted ? PRINT_VOTED : PRINT_REJECTED, t.statusFeed);
  await pause(t.statusFeed);

  setMotor(side, false);
  await pause(t.motorSettle);

  setLed(redLed, false);
  setLed(greenLed, true);
  activeVote = null;
  showScreen(accepted ? 'thanks' : 'terminated');
  busy = false;            // the recycle button is usable from here on

  await pause(t.resultHold);
  setMotor(side, true);
  ejectPrints(side, t.statusFeed);
  await pause(t.statusFeed);
  setMotor(side, false);
  setGlass(side, false);
}

/* ===========================================================
 * NAVIGATION — Home never touches vote records or cycles
 * =========================================================== */
function goHome() {
  cancelFlow();
  stopScreenTimer();
  if (activeVote && !activeVote.finalized) voteSession.abandonVote();
  activeVote = null;
  busy = false;
  hardwareDefault();
  showScreen('home');
}

/* ===========================================================
 * SETTINGS SCREEN
 * =========================================================== */
const settingInputs = document.querySelectorAll('[data-setting]');
const choiceGroups  = document.querySelectorAll('[data-choice]');
const draftChoices  = {};   // segmented-control picks, saved only on Save

/* segmented controls: printer (TOP / BOTTOM / RANDOM), faultyPrints (On / Off) */
function setChoice(group, value) {
  draftChoices[group.dataset.choice] = value;
  group.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.value === value));
}

function fillSettingsForm(values) {
  settingInputs.forEach(input => {
    const [group, key] = input.dataset.setting.split('.');
    input.value = values[group][key];
  });
  choiceGroups.forEach(group => setChoice(group, String(values[group.dataset.choice])));
}

function readSettingsForm() {
  const out = {
    printer: draftChoices.printer,
    faultyPrints: draftChoices.faultyPrints === 'true',
    timeouts: {},
    transitions: {}
  };
  settingInputs.forEach(input => {
    const [group, key] = input.dataset.setting.split('.');
    out[group][key] = input.value;
  });
  return out;
}

function openSettings() {
  const stats = voteSession.getStats();
  $('#statTotal').textContent    = stats.total;
  $('#statAccepted').textContent = stats.accepted;
  $('#statRejected').textContent = stats.rejected;
  fillSettingsForm(settings);
  showScreen('settings');
  $('.set-body').scrollTop = 0;
}

choiceGroups.forEach(group => group.addEventListener('click', (e) => {
  const b = e.target.closest('[data-value]');
  if (b) setChoice(group, b.dataset.value);
}));

/* ===========================================================
 * CLICK DELEGATION for screen buttons
 * =========================================================== */
document.body.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]');
  if (!a || a.disabled) return;
  const action = a.dataset.action;
  if (busy && action !== 'home') return;

  switch (action) {
    case 'goConstituency':   showScreen('constituency'); break;
    case 'goGrid':           showScreen('grid'); break;
    case 'terminated':       showScreen('terminated'); break;
    case 'home':             goHome(); break;
    case 'power':            break;
    case 'settings':         openSettings(); break;
    case 'acceptImage':      startVote(); break;
    case 'printVoted':       handleUserResponse('YES'); break;
    case 'printRejected':    handleUserResponse('NO'); break;
    case 'settingsCancel':   goHome(); break;
    case 'settingsDefaults': fillSettingsForm(KioskSettings.DEFAULTS); break;
    case 'settingsSave':     settings = KioskSettings.save(readSettingsForm()); goHome(); break;
  }
});

/* ===========================================================
 * FULL SCREEN — the whole kiosk, scaled to fit the display
 * =========================================================== */
const stage = $('#kioskStage');
const kiosk = $('#kiosk');
const nativeFsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

function fitKiosk() {
  if (!stage.classList.contains('is-fullscreen')) return;
  const fit = Math.min(
    (stage.clientWidth  - 48) / kiosk.offsetWidth,
    (stage.clientHeight - 48) / kiosk.offsetHeight
  );
  kiosk.style.setProperty('--fit', Math.max(0.1, fit).toFixed(4));
}

function enterFullscreen() {
  stage.classList.add('is-fullscreen');
  document.documentElement.classList.add('fs-lock');
  fitKiosk();
  const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
  if (req) {
    try {
      const p = req.call(stage);
      if (p && p.catch) p.catch(() => {});   // falls back to the in-page full view
    } catch { /* in-page full view only */ }
  }
}

function leaveFullscreenView() {
  stage.classList.remove('is-fullscreen');
  document.documentElement.classList.remove('fs-lock');
  kiosk.style.removeProperty('--fit');
}

function exitFullscreen() {
  if (nativeFsElement()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    leaveFullscreenView();
  }
}

function onFullscreenChange() {
  if (nativeFsElement()) fitKiosk();
  else leaveFullscreenView();
}

$('#fsExpandBtn').addEventListener('click', enterFullscreen);
$('#fsRestoreBtn').addEventListener('click', exitFullscreen);
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);
window.addEventListener('resize', fitKiosk);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !nativeFsElement() && stage.classList.contains('is-fullscreen')) {
    leaveFullscreenView();
  }
});

/* ---- power on ---- */
goHome();
