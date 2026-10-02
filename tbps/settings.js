/* ===========================================================
 * TBPS – Kiosk settings (the demo's config.ini)
 * Persisted in the browser so they survive a page refresh.
 * Vote data is NOT stored here — it lives only in memory.
 * =========================================================== */
const KioskSettings = (() => {
  const KEY = 'tbps.settings.v1';
  const LEGACY_KEY = 'vpm.settings.v1';   // name used before the folder was renamed to tbps
  const PRINTERS = ['RANDOM', 'TOP', 'BOTTOM'];

  /* all values in seconds */
  const DEFAULTS = Object.freeze({
    printer: 'RANDOM',
    faultyPrints: true,
    timeouts: Object.freeze({
      constituency:  100,
      confirmSymbol: 100,
      confirmPrint:  10,
      thanks:        10,
      terminated:    10
    }),
    transitions: Object.freeze({
      printStart:  0.5,
      symbolFeed:  2,
      motorSettle: 0.35,
      statusFeed:  1.5
    })
  });

  const LIMITS = { timeouts: [1, 999], transitions: [0, 30] };

  function clampGroup(group, raw) {
    const [min, max] = LIMITS[group];
    const out = {};
    for (const key of Object.keys(DEFAULTS[group])) {
      const n = Number(raw && raw[key]);
      out[key] = Number.isFinite(n) && raw[key] !== '' ? Math.min(max, Math.max(min, n)) : DEFAULTS[group][key];
    }
    return out;
  }

  function sanitize(raw) {
    raw = raw || {};
    return {
      printer: PRINTERS.includes(raw.printer) ? raw.printer : DEFAULTS.printer,
      faultyPrints: typeof raw.faultyPrints === 'boolean' ? raw.faultyPrints : DEFAULTS.faultyPrints,
      timeouts: clampGroup('timeouts', raw.timeouts),
      transitions: clampGroup('transitions', raw.transitions)
    };
  }

  function load() {
    try { return sanitize(JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY))); }
    catch { return sanitize(null); }
  }

  function save(raw) {
    const clean = sanitize(raw);
    try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* storage unavailable */ }
    return clean;
  }

  return { DEFAULTS, load, save, sanitize };
})();
