/** The size the room's furniture is drawn at: the stage unit, but never more than 0.6 of its width (narrow phones). */
export const pieceUnit = (unit: number, width: number): number => Math.min(unit, width * 0.6)
