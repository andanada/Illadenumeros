/**
 * Every number that decides "learned" in one place (documented in the README, section "Com es defineix
 * dominar una habilitat"). Changing one here changes the engine, the daily mission and the adult dashboard.
 */

/** Leitner boxes: box 0 = same session; then 1, 2, 4, 9, 21 days. */
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 9, 21] as const

export const MASTERY_THRESHOLDS = {
  leitner: {
    /** After an error the fact comes back within the same session. */
    retrySoonMs: 30_000,
    /** Number of last correct response times kept per fact. */
    recentRtWindow: 5,
    /** Lenient fluency target (x) used to move a fact up a box while confidence is built. */
    fluencyLeniency: 1.5,
    /** A fact in a box below this is still "being learned" for the purpose of the 3-new-facts limit. */
    inFlightStreak: 2,
  },
  skill: {
    /** Smoothed mastery needed for "dominada". */
    masteredAt: 0.85,
    consolidatingAt: 0.6,
    /** A mastered skill keeps its status until mastery drops below this (hysteresis). */
    keepMasteredAbove: 0.65,
    minAttempts: 20,
    minSessions: 2,
    /** Prerequisites open a skill from this mastery (graph). */
    unlockAt: 0.6,
  },
  /** Extra retention gate for the core-operation fact skills (add, sub, mul, div). */
  core: {
    /** A fact counts as "automatitzat" from this Leitner box on... */
    factMinBox: 4,
    /** ...if its median response time is within the strict target of its skill. */
    strictFluentMs: { addSub: 3000, mulDiv: 4000 },
    /** Share of the skill's facts that must be automatised to gain "dominada". */
    gainShare: 0.9,
    /** Lenient share to KEEP it (hysteresis, so one slip never takes it away). */
    keepShare: 0.75,
    /** Distinct days with a clean (no help) correct answer in the skill. */
    minCleanDays: 3,
    /** Only the last N days are looked at for clean days. */
    cleanDaysWindow: 90,
  },
  session: {
    reviewShare: 0.7,
    occasionalReview: 0.25,
    maxFactsInFlight: 3,
    accuracyWindow: 8,
    lowAccuracy: 0.7,
    highAccuracy: 0.9,
    /** Partners of a practised fact come back this many questions later (never back-to-back). */
    familyGapMin: 2,
    familyGapMax: 4,
    maxFamilyPartnersQueued: 2,
    /** Planned follow-ups waiting in the session at any time (partners, twins, helped facts). */
    maxQueued: 3,
    /** A fact is asked at most this many times per session by the selector (no endless drilling of the same few). */
    maxAsksPerSession: 2,
  },
  mission: {
    /** Minutes the daily mission should last. */
    minutes: 12,
    /** Share of questions that go to the operation in progress. */
    coreShare: 0.5,
    /** Chance that the selector aims a question at the operation in progress (the rest comes from reviews and other skills). */
    coreWeight: 0.75,
    /** Warm-up ("Duel Llampec") only uses facts already in this box or above. */
    warmupMinBox: 2,
    /** Soften (easier, more visual) when accuracy over the last `softenWindow` answers is below this. */
    softenBelow: 0.7,
    softenWindow: 10,
  },
} as const

/** Strict fluency target of a fact skill, by operation ("add"/"sub" 3 s, "mul"/"div" 4 s). */
export const strictTargetFor = (operation: 'add' | 'sub' | 'mul' | 'div'): number =>
  operation === 'add' || operation === 'sub' ? MASTERY_THRESHOLDS.core.strictFluentMs.addSub : MASTERY_THRESHOLDS.core.strictFluentMs.mulDiv
