/* ===========================================================
 * EVM – Animated Demo
 * State machine that mirrors main.py's screen flow plus
 * synchronised smart-glass / LED / motor / paper animation.
 *
 * The GUI pane is a 1:1 replica of the 480×800 Tkinter UI:
 * real assets from ../assets/, real widget geometry, and the
 * same screen sequence (there is NO separate "printing"
 * screen — main.py blocks on print_image() while the confirm
 * screen stays visible).
 * =========================================================== */

const ASSETS = '../assets';

/* Same files main.py loads from assets/images/ */
const SYMBOLS = ['Bag', 'Bell', 'Bulb', 'Car', 'Clock', 'Coffee', 'Dumbel', 'Fish', 'Glass']
  .map(name => ({ name, img: `${ASSETS}/images/${name}.png` }));

/* ---- DOM handles ---- */
const $ = (sel) => document.querySelector(sel);
const screens = document.querySelectorAll('.screen');

const topWindow      = $('#topWindow');
const bottomWindow   = $('#bottomWindow');
const topPaperContent    = $('#topPaperContent');
const bottomPaperContent = $('#bottomPaperContent');

const greenLed       = $('#greenLed');
const redLed         = $('#redLed');
const topMotor       = $('#topMotor');
const bottomMotor    = $('#bottomMotor');

const rollTop        = $('#rollTop');
const rollBottom     = $('#rollBottom');

const stepTitle      = $('#stepTitle');
const stepDetail     = $('#stepDetail');

const playBtn        = $('#playBtn');
const stepBtn        = $('#stepBtn');
const resetBtn       = $('#resetBtn');
const speedInput     = $('#speed');
const speedVal       = $('#speedVal');
const printerSel     = $('#printerSel');
const scaleInput     = $('#scale');
const scaleVal       = $('#scaleVal');

/* ---- speed control ---- */
let speed = 1.2;
speedInput.addEventListener('input', () => {
  speed = parseFloat(speedInput.value);
  speedVal.textContent = speed.toFixed(1) + '×';
});
const wait = (ms) => new Promise(r => setTimeout(r, ms / speed));

/* ---- screen scale control (display only — layout stays 480×800) ---- */
scaleInput.addEventListener('input', () => {
  const s = parseFloat(scaleInput.value);
  document.documentElement.style.setProperty('--s', s);
  scaleVal.textContent = `${Math.round(480 * s)}×${Math.round(800 * s)}`;
});

/* ---- per-screen countdown (mirrors start_timer() in main.py) ---- */
let timerId = null;
function stopScreenTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}
function startScreenTimer(screenEl) {
  stopScreenTimer();
  const label = screenEl.querySelector('.time-left');
  const secs  = parseInt(screenEl.dataset.seconds, 10);
  if (!label || !secs) return;
  let t = secs;
  const render = () => { label.textContent = `Time Left to accept: ${t} seconds`; };
  render();
  timerId = setInterval(() => {
    if (t > 0) { t--; render(); } else { stopScreenTimer(); }
  }, 1000 / speed);
}

/* ---- screen + UI helpers ---- */
function showScreen(name) {
  screens.forEach(s => s.classList.toggle('active', s.dataset.screen === name));
  const active = document.querySelector(`.screen[data-screen="${name}"]`);
  if (active) startScreenTimer(active);
}
function setNarrative(title, detail) {
  stepTitle.innerHTML = title;
  stepDetail.innerHTML = detail;
}
function setLed(el, on) { el.classList.toggle('on', !!on); }

function setGlass(side, on) {
  const win = side === 'top' ? topWindow : bottomWindow;
  win.classList.toggle('glass-on', on);
  win.classList.toggle('led-on', on);
}
function setMotor(side, on) {
  const m = side === 'top' ? topMotor : bottomMotor;
  m.classList.toggle('on', on);
  const r = side === 'top' ? rollTop : rollBottom;
  r.classList.toggle('spinning', on);
}
function slidePaperIn(side, html) {
  const win = side === 'top' ? topWindow : bottomWindow;
  const content = side === 'top' ? topPaperContent : bottomPaperContent;
  content.innerHTML = html;
  win.classList.add('printing');
}
function slidePaperOut(side) {
  const win = side === 'top' ? topWindow : bottomWindow;
  win.classList.remove('printing');
}

/* ---- populate symbol grid (grid_screen builds it from assets/images/) ---- */
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

/* ---- state ---- */
let currentSymbol = SYMBOLS[3]; // Car
let selectedSide  = 'top';
let playing = false;

/* ---- printer selection (mirrors select_printer()) ---- */
function pickPrinter() {
  const mode = printerSel.value;
  if (mode === 'top')    return 'top';
  if (mode === 'bottom') return 'bottom';
  return Math.random() < 0.5 ? 'top' : 'bottom';
}

/* ---- click delegation for screen buttons ---- */
document.body.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]');
  if (!a || playing) return;
  switch (a.dataset.action) {
    case 'goConstituency':
      showScreen('constituency');
      setNarrative('Constituency', 'Confirm the constituency before proceeding to the symbol grid (<code>show_constituency_screen()</code>, 100 s timer).');
      break;
    case 'goGrid':
      showScreen('grid');
      setNarrative('Symbol grid', 'Scrollable 2-column grid of 150×150 symbols loaded from <code>assets/images/</code>.');
      break;
    case 'terminated':
      showScreen('terminated');
      setNarrative('Voting terminated', 'User answered <b>No</b>. Auto-returns Home after <code>termination_timer</code> (10 s).');
      break;
    case 'home':          resetEverything(); break;
    case 'power':         alert('In the real app: PasscodeDialog → shutdown.'); break;
    case 'settings':      alert('In the real app: PasscodeDialog → setting_screen (config.ini editor).'); break;
    case 'acceptImage':   runPrintFlow(); break;
    case 'printVoted':    runVotedFlow(true); break;
    case 'printRejected': runVotedFlow(false); break;
  }
});

function onSymbolClick(sym) {
  currentSymbol = sym;
  $('#bigSymbol').src = sym.img;
  $('#bigSymbol').alt = sym.name;
  showScreen('confirm-symbol');
  setNarrative('Confirm symbol',
    `User tapped <b>${sym.name}</b>. <code>open_image_screen()</code> shows the 250×250 preview and waits for confirmation.`);
}

/* ---- print + confirm flows ---- */
async function runPrintFlow() {
  playing = true;
  selectedSide = pickPrinter();

  setNarrative('Printing the ballot',
    `<code>accept_image()</code> runs — the GUI stays frozen on this screen while
     <code>print_image()</code> blocks, exactly like the Tkinter app.
     Printer: <b>${selectedSide.toUpperCase()}</b>. Red LED on, smart glass clears,
     window LED lights, and the DC motor pulls the paper through.`);

  setLed(greenLed, false);
  setLed(redLed, true);
  setGlass(selectedSide, true);
  await wait(600);
  setMotor(selectedSide, true);
  slidePaperIn(selectedSide,
    `<img class="slip-img" src="${currentSymbol.img}" alt="${currentSymbol.name}"/>`);
  await wait(2400);

  setMotor(selectedSide, false);
  await wait(400);

  $('#bigSymbolConfirm').src = currentSymbol.img;
  $('#bigSymbolConfirm').alt = currentSymbol.name;
  showScreen('confirm-print');
  setNarrative('Confirm the printed ballot',
    'Behind the now-transparent window, the user sees the printed symbol slip. Yes → overprint <b>VOTED</b> + barcode. No → <b>REJECTED</b>.');
  playing = false;
}

async function runVotedFlow(accepted) {
  playing = true;
  if (accepted) {
    slidePaperIn(selectedSide,
      `<div class="barcode-vert"></div><span>VOTED</span><div class="barcode-vert"></div>`);
    setNarrative('VOTED slip printed',
      'A unique 12-digit EAN-13 barcode is generated (stored in <code>database.db</code>) and printed alongside the word <b>VOTED</b>.');
  } else {
    slidePaperIn(selectedSide, `<span>REJECTED</span>`);
    setNarrative('REJECTED slip printed',
      'The kiosk overprints <b>REJECTED</b> on the slip and moves the user to the terminated screen.');
  }

  setMotor(selectedSide, true);
  await wait(1800);
  setMotor(selectedSide, false);
  await wait(400);

  setLed(redLed, false);
  setLed(greenLed, true);

  if (accepted) {
    showScreen('thanks');
    setNarrative('Thank you for voting',
      '<code>voting_thanks_screen()</code> — full-screen art from <code>assets/thank_you_screen/</code>. After the 10 s timer the kiosk returns Home.');
  } else {
    showScreen('terminated');
    setNarrative('Voting terminated', 'The kiosk returns Home after a short timeout.');
  }

  await wait(2200);
  setGlass(selectedSide, false);
  slidePaperOut(selectedSide);
  playing = false;
}

/* ---- reset ---- */
function resetEverything() {
  setLed(greenLed, true);
  setLed(redLed, false);
  setGlass('top', false);
  setGlass('bottom', false);
  setMotor('top', false);
  setMotor('bottom', false);
  slidePaperOut('top');
  slidePaperOut('bottom');
  showScreen('home');
  setNarrative('Idle',
    'Kiosk is on the Home screen (<code>open_vote_window()</code>). System LED is on; both smart-glass print windows are opaque.');
}
resetEverything();

/* ===========================================================
 * FULL DEMO
 * =========================================================== */
const STEPS = [
  {
    do: async () => resetEverything(),
    title: 'Power on',
    detail: 'System boots. <code>main.py</code> initialises GPIOs and shows Home. System LED on, both glasses opaque.'
  },
  {
    do: async () => showScreen('home'),
    title: '1 · Home',
    detail: 'The real 480×800 home art: <b>CLICK HERE TO VOTE</b> at (50, 630), Power at (39, 723), Settings at (393, 719) — both passcode-protected.'
  },
  {
    do: async () => showScreen('constituency'),
    title: '2 · Constituency',
    detail: 'Confirm the constituency before the symbol grid is shown. <code>constituency_timer</code> = 100 seconds.'
  },
  {
    do: async () => showScreen('grid'),
    title: '3 · Symbol grid',
    detail: '2-column grid populated from <code>assets/images/</code>; 150×150 buttons with the file name on a black label below.'
  },
  {
    do: async () => {
      currentSymbol = SYMBOLS[3];
      $('#bigSymbol').src = currentSymbol.img;
      showScreen('confirm-symbol');
    },
    title: '4 · Confirm symbol',
    detail: '250×250 preview with Yes / No. Timeout auto-accepts (<code>confim_selection_timer</code> = 100 s).'
  },
  {
    do: async () => {
      selectedSide = pickPrinter();
      setLed(greenLed, false);
      setLed(redLed, true);
    },
    title: '5 · Printing starts — Red LED on',
    detail: () => `Printer selected: <b>${selectedSide.toUpperCase()}</b>
                  (config = <code>${printerSel.value.toUpperCase()}</code>).
                  The GUI stays on the confirm screen — Tkinter blocks inside <code>accept_image()</code>.`
  },
  {
    do: async () => setGlass(selectedSide, true),
    title: '6 · Smart glass → transparent',
    detail: () => `<code>glass_action(${selectedSide}_glass_pin, "ON")</code> drives the PDLC film clear.
                   <code>glass_led_action(${selectedSide}_led_pin, "ON")</code> lights the ballot area.`
  },
  {
    do: async () => {
      setMotor(selectedSide, true);
      slidePaperIn(selectedSide,
        `<img class="slip-img" src="${currentSymbol.img}" alt="${currentSymbol.name}"/>`);
    },
    title: '7 · Motor rolls — symbol slip slides out',
    detail: () => `<code>dc_motor_${selectedSide}.start()</code>. Paper feeds through the print head
                   (rotated −90° by <code>resize_print_image()</code>) and emerges behind the clear glass.`,
    dwell: 2600
  },
  {
    do: async () => setMotor(selectedSide, false),
    title: '8 · Motor stops',
    detail: () => `After <code>motor_delay_time_${selectedSide}_motor</code> seconds, <code>dc_motor_${selectedSide}.stop()</code> is called.`
  },
  {
    do: async () => {
      $('#bigSymbolConfirm').src = currentSymbol.img;
      showScreen('confirm-print');
    },
    title: '9 · Confirm the print',
    detail: 'User compares the visible slip with their selection. Yes → finalise vote, No → reject.'
  },
  {
    do: async () => {
      slidePaperIn(selectedSide,
        `<div class="barcode-vert"></div><span>VOTED</span><div class="barcode-vert"></div>`);
      setMotor(selectedSide, true);
    },
    title: '10 · VOTED + EAN-13 barcode',
    detail: () => `<code>unique_barcode()</code> generates a fresh 12-digit code, stored in
                   <code>database/database.db</code>. <code>print_vote_status()</code> draws barcodes on
                   both edges and the word <b>VOTED</b> in the centre.`,
    dwell: 2000
  },
  {
    do: async () => {
      setMotor(selectedSide, false);
      setLed(redLed, false);
      setLed(greenLed, true);
      showScreen('thanks');
    },
    title: '11 · Thank-you',
    detail: '<code>voting_thanks_screen()</code> — the real 480×800 background art, recycle button at (400, 20). After 10 s the kiosk returns Home.'
  },
  {
    do: async () => {
      setGlass(selectedSide, false);
      slidePaperOut(selectedSide);
      await wait(800);
      resetEverything();
    },
    title: '12 · Reset to idle',
    detail: '<code>hardware_default()</code> turns all glass + LEDs off and re-shows the Home screen. Ready for the next voter.'
  }
];

async function playDemo() {
  if (playing) return;
  playing = true;
  playBtn.disabled = true;
  resetEverything();
  await wait(400);
  for (const s of STEPS) {
    setNarrative(s.title, typeof s.detail === 'function' ? s.detail() : s.detail);
    await s.do();
    await wait(s.dwell ?? 1600);
  }
  playBtn.disabled = false;
  playing = false;
}

let stepIndex = 0;
async function nextStep() {
  if (playing) return;
  if (stepIndex >= STEPS.length) stepIndex = 0;
  const s = STEPS[stepIndex];
  setNarrative(s.title, typeof s.detail === 'function' ? s.detail() : s.detail);
  playing = true;
  await s.do();
  playing = false;
  stepIndex++;
}

playBtn.addEventListener('click', playDemo);
stepBtn.addEventListener('click', nextStep);
resetBtn.addEventListener('click', () => { stepIndex = 0; resetEverything(); });
