/* ===========================================================
 * EVM – Vote engine
 * Scenario generation, cycle management, decision rules and
 * the in-memory vote records for the current page session.
 *
 * The engine generates the ground truth: every scenario already
 * knows whether its print is correct or faulty. Nothing here
 * inspects images, and nothing here touches the DOM.
 *
 *   Votes 1–2      → warm-up, always printed correctly
 *   Votes 3, 4, 5  → cycle 1, exactly one faulty print
 *   Votes 6, 7, 8  → cycle 2, exactly one faulty print
 *   ...            → unlimited
 *
 * With faulty prints switched off, votes print correctly and sit
 * outside the cycles; switching back on resumes the pending cycle.
 * =========================================================== */
const VoteEngine = (() => {
  const WARMUP_VOTES = 2;
  const CYCLE_SIZE   = 3;

  const REASONS = {
    faulty:   'Printed image does not match selected image',
    rejected: 'Voter reported the print as incorrect',
    accepted: 'Voter confirmed the print',
    timeout:  'No response before timeout; print matches selection'
  };

  /* faulty position (0-based) inside one cycle */
  function generateCycle(rng) {
    return Math.floor(rng() * CYCLE_SIZE);
  }

  /* The generated truth has priority over the voter's response. */
  function evaluateVote(isFaulty, response) {
    if (isFaulty)             return { decision: 'REJECTED', reason: REASONS.faulty };
    if (response === 'NO')    return { decision: 'REJECTED', reason: REASONS.rejected };
    if (response === 'YES')   return { decision: 'ACCEPTED', reason: REASONS.accepted };
    return { decision: 'ACCEPTED', reason: REASONS.timeout };
  }

  function createSession(symbolNames, rng = Math.random) {
    const voteRecords = [];
    const cycles = new Map();   // cycleNumber → faulty position, fixed once generated
    let cycleVotes = 0;         // recorded votes that took part in a cycle
    let active = null;          // scenario currently on the printer

    function initializeCycle(cycleNumber) {
      if (!cycles.has(cycleNumber)) cycles.set(cycleNumber, generateCycle(rng));
      return cycles.get(cycleNumber);
    }

    /* cycleNumber 0 = warm-up vote, or faulty prints switched off */
    function planVote(voteNumber, faultyEnabled) {
      if (voteNumber <= WARMUP_VOTES || !faultyEnabled) return { cycleNumber: 0, isFaulty: false };
      const index = cycleVotes;
      const cycleNumber = Math.floor(index / CYCLE_SIZE) + 1;
      const faultyAt = initializeCycle(cycleNumber);
      return { cycleNumber, isFaulty: faultyAt === index % CYCLE_SIZE };
    }

    function pickOtherSymbol(name) {
      const others = symbolNames.filter(n => n !== name);
      return others[Math.floor(rng() * others.length)];
    }

    /* Called when printing starts. The returned scenario is frozen for the rest of the vote. */
    function generateVoteScenario(selectedImage, faultyEnabled = true) {
      const voteNumber = voteRecords.length + 1;
      const { cycleNumber, isFaulty } = planVote(voteNumber, faultyEnabled);
      active = Object.freeze({
        voteNumber,
        cycleNumber,
        selectedImage,
        printedImage: isFaulty ? pickOtherSymbol(selectedImage) : selectedImage,
        isFaulty
      });
      return active;
    }

    /* Finalises a vote exactly once; stale or repeated calls return null. */
    function recordVote(scenario, userResponse) {
      if (!scenario || scenario !== active) return null;
      active = null;
      if (scenario.cycleNumber > 0) cycleVotes++;
      const { decision, reason } = evaluateVote(scenario.isFaulty, userResponse);
      const record = Object.freeze({
        ...scenario,
        userResponse,
        timedOut: userResponse === 'TIMEOUT',
        decision,
        reason,
        timestamp: new Date().toISOString()
      });
      voteRecords.push(record);
      return record;
    }

    /* A vote left before it was finalised keeps its slot (and its planned truth). */
    function abandonVote() {
      active = null;
    }

    function getStats() {
      const accepted = voteRecords.filter(r => r.decision === 'ACCEPTED').length;
      return { total: voteRecords.length, accepted, rejected: voteRecords.length - accepted };
    }

    return { generateVoteScenario, recordVote, abandonVote, getStats, records: voteRecords };
  }

  return { createSession, evaluateVote, WARMUP_VOTES, CYCLE_SIZE };
})();

if (typeof module !== 'undefined') module.exports = VoteEngine;
