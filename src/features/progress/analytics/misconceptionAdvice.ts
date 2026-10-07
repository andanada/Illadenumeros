import { MISCONCEPTIONS, type MisconceptionId } from '../../../core/ambit/types'

export interface Advice {
  title: string
  explanation: string
  tip: string
}

/** Plain-Catalan reading of every misconception and a kind, concrete idea to try at home. */
export const MISCONCEPTION_ADVICE: Record<MisconceptionId, Advice> = {
  'off-by-one': {
    title: 'Es queda a un d’encertar',
    explanation: 'La resposta és molt a prop: passa sovint quan es compta de cop i es compta un de més o un de menys.',
    tip: 'Compteu junts amb els dits o amb fitxes, tocant cada objecte una sola vegada. Després proveu de saltar des del nombre gran: «el 8 i 3 més: 9, 10, 11».',
  },
  'operation-swap': {
    title: 'Canvia l’operació',
    explanation: 'A vegades fa una suma quan tocava una resta (o al revés): encara no es fixa del tot en el signe.',
    tip: 'Abans de resoldre, encercleu el signe amb un llapis de color i digueu-lo en veu alta: «aquí he de treure». Poseu-ho en una història de galetes: «en tinc 9 i me’n menjo 4».',
  },
  'no-carry': {
    title: 'Oblida la desena que es “porta”',
    explanation: 'En sumar passant de la desena, la desena que es forma es perd pel camí.',
    tip: 'Feu servir fitxes i una fila de 10: ompliu primer la fila i el que sobra es compta a part. Proveu 8 + 5 com «8 + 2 = 10, i 3 més».',
  },
  'reverse-digits': {
    title: 'Gira les xifres',
    explanation: 'Escriu o tria les xifres en l’ordre contrari (41 en lloc de 14). És molt habitual a aquesta edat.',
    tip: 'Parleu de «desenes i unitats» amb monedes de 10 cèntims i d’1 cèntim: 14 són una moneda de 10 i quatre d’1. El que val més va a l’esquerra.',
  },
  'place-value-concat': {
    title: 'Enganxa els nombres',
    explanation: 'Posa un nombre al costat de l’altre (3 i 5 fan 35) en lloc d’operar-los.',
    tip: 'Dibuixeu dos munts de coses i feu-los «ajuntar» de veritat. Pregunteu: «si en tens 3 i te’n donen 5, en tens 35 o menys?», per sentir si la mida té sentit.',
  },
  'adjacent-fact': {
    title: 'Confon taules veïnes',
    explanation: 'Dona el resultat d’una taula propera (la del 7 amb la del 6 o la del 8): coneix els fets, però encara no els té ben fixats.',
    tip: 'Practiqueu una sola taula alhora amb galetes en files: 7 files de 8 galetes i després 7 files de 6. Compareu què canvia: una fila menys són 7 galetes menys.',
  },
  'wrong-direction': {
    title: 'Va cap a l’altre costat',
    explanation: 'A la recta numèrica o en comptar enrere es mou en direcció contrària a la que toca.',
    tip: 'Dibuixeu una recta al terra amb cinta i feu els salts amb el cos: sumar és caminar endavant, restar és tornar enrere. Que ho digui en veu alta.',
  },
  'mult-as-add': {
    title: 'Suma en lloc de multiplicar',
    explanation: 'En veure 3 × 4 pensa «3 + 4». Encara està construint la idea de «grups iguals».',
    tip: 'Poseu 3 plats amb 4 llaminadures cadascun i comptin quantes n’hi ha en total. Digueu «3 grups de 4» i després compteu de 4 en 4.',
  },
  'div-as-sub': {
    title: 'Resta en lloc de dividir',
    explanation: 'En veure 12 : 3 pensa 12 − 3. Encara no ha enllaçat dividir amb repartir en parts iguals.',
    tip: 'Repartiu 12 caramels entre 3 plats d’un en un, com si fos de veritat. Després pregunteu «quants en té cada plat?» i comproveu-ho amb la taula del 3.',
  },
  'remainder-forgotten': {
    title: 'Es perd el que sobra',
    explanation: 'En les divisions que no són exactes oblida el residu o el posa com si fos el resultat.',
    tip: 'Repartiu 14 galetes entre 4 persones i deixeu les que sobren al mig de la taula. Expliqueu-ho: «a cadascú li’n toquen 3 i en sobren 2».',
  },
  'denominator-as-count': {
    title: 'Confon parts i quantitat',
    explanation: 'Amb fraccions d’una col·lecció fa servir el nombre de parts com a resposta («un quart de 12» → 4).',
    tip: 'Repartiu 12 fitxes en 4 munts iguals i agafeu-ne un: «un quart» és un munt. Compteu quantes fitxes té aquest munt abans de dir el resultat.',
  },
  'euro-cent-mix': {
    title: 'Barreja euros i cèntims',
    explanation: 'Costa saber quan una xifra són euros i quan són cèntims (2,50 € o 2,05 €).',
    tip: 'Jugueu a botiga amb monedes reals: amb dues monedes d’1 € i una de 50 cèntims, escriviu junts 2,50 €. Deixeu que sigui ella qui pagui i qui rebi el canvi.',
  },
  'place-value-zero': {
    title: 'Perd o afegeix un zero',
    explanation: 'En nombres com el 305 el zero guarda el lloc de les desenes; de vegades es perd o n’apareix un de més.',
    tip: 'Dibuixeu una taula de centenes, desenes i unitats amb tres caselles. Escriviu 305 posant 3, 0 i 5: a la del mig no hi ha cap desena, però la casella hi és.',
  },
  'one-step-only': {
    title: 'S’atura al primer pas',
    explanation: 'En els problemes de dos passos fa només la primera operació i dona aquest resultat.',
    tip: 'Llegiu el problema en veu alta i pregunteu «què ens demanen al final?». Dibuixeu dos quadrets, un per pas, i ompliu-los d’un en un.',
  },
}

export interface TopMisconception extends Advice {
  id: MisconceptionId
  count: number
}

/** The most frequent misconceptions (at most 5), most frequent first; ties keep the enum order. */
export function topMisconceptions(counts: Partial<Record<MisconceptionId, number>>, limit = 5): TopMisconception[] {
  return MISCONCEPTIONS.map((id) => ({ id, count: counts[id] ?? 0 }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((m) => ({ ...m, ...MISCONCEPTION_ADVICE[m.id] }))
}
