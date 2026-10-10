/** Wall + floor bands that every room of a place shares; colours tell the rooms apart (flat, no outlines). */
export function RoomShell({ wall, wall2, floor, floor2, trim, floorTop = 0.46, tiles = 8 }: { wall: string; wall2: string; floor: string; floor2: string; trim: string; floorTop?: number; tiles?: number }) {
  const top = `${floorTop * 100}%`
  return (
    <>
      <div className="absolute inset-x-0 top-0" style={{ height: top, background: `linear-gradient(${wall}, ${wall2})` }} />
      <div className="absolute inset-x-0" style={{ top: `${floorTop * 100 - 2.5}%`, height: '3%', background: trim }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top, background: `repeating-linear-gradient(90deg, ${floor} 0 ${tiles}%, ${floor2} ${tiles}% ${tiles * 2}%)` }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top, background: 'linear-gradient(rgba(43,36,64,0.16), rgba(43,36,64,0) 24%)' }} />
    </>
  )
}
