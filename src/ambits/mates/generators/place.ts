/** Catalan names of decimal places, with number agreement ("1 dècima", "5 dècimes"). */
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
export const unitsText = (n: number): string => plural(n, 'unitat', 'unitats')
export const tenthsText = (n: number): string => plural(n, 'dècima', 'dècimes')
export const hundredthsText = (n: number): string => plural(n, 'centèsima', 'centèsimes')
