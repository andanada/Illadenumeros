/**
 * Fixed child-facing phrases that are always pre-generated (highest priority, ~1 KB of text in total).
 * The app speaks only question prompts today; these are the messages already shown on screen
 * (feedback, celebration, encouragement, onboarding, diagnostic, game instructions), so a future
 * `speak('Molt bé!')` plays the studio voice from day one. Add a phrase here, then regenerate.
 */
export const FIXED_PHRASES: readonly string[] = [
  // Feedback and celebration
  'Molt bé!',
  'Molt bé! Anem pel següent.',
  'Molt bé, has arribat!',
  'Quin salt! Camí perfecte.',
  'Has arribat! Camí més curt? Prova amb salts de 10.',
  'Quina meravella!',
  'Has après molt!',
  'Un pas d’exploració!',
  'Fantàstic!',
  'Genial!',
  'Perfecte!',
  'Bona feina!',
  'Ho has aconseguit!',
  // Encouragement after a mistake (never a punishment)
  'Gairebé!',
  'Gairebé! Torna-ho a provar.',
  'Cap problema, ho tornem a provar.',
  'Ho tens a prop!',
  'Prova-ho un altre cop.',
  'Respira i pensa-hi un moment.',
  'Continua així!',
  'Un a cada plat! Prova en un altre plat.',
  // Onboarding and diagnostic
  'Hola! Com et dius?',
  'Tria el teu personatge preferit.',
  'Tria el teu color preferit.',
  'Anem a descobrir l’illa dels números!',
  'Anem a explorar l’illa dels números!',
  'Toca per començar.',
  'Som-hi!',
  // Game instructions
  'Escolta la pregunta i toca la resposta.',
  'Toca la resposta que creguis correcta.',
  'Arrossega les peces fins al lloc correcte.',
  'Quants n’hi ha?',
  'Són 4 jocs ràpids.',
]
