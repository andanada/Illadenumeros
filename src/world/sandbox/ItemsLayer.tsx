import { Interactable } from './Interactable'
import { useItems } from './ItemsContext'
import { itemsIn, itemsInRoom } from './logic/itemsState'
import { useStage } from './StageContext'

/** Every object lying in this stage's room, objects in the air, and the contents of open containers. */
export function ItemsLayer() {
  const { items, flights } = useItems()
  const { room } = useStage()
  const lying = itemsInRoom(items, room).filter((i) => !flights[i.uid])
  const flying = Object.entries(flights).filter(([, f]) => f.room === room)
  const trays = lying.filter((i) => i.open).flatMap((box) => itemsIn(items, box.uid).map((inside, n) => ({ inside, at: { x: Math.max(0.06, (box.loc.t === 'floor' ? box.loc.at.x : 0.5) - 0.1 - n * 0.08), y: box.loc.t === 'floor' ? box.loc.at.y : 0.8 } })))
  return (
    <>
      {lying.map((item) => (item.loc.t === 'floor' ? <Interactable key={item.uid} item={item} at={item.loc.at} /> : null))}
      {trays.map(({ inside, at }) => (
        <Interactable key={inside.uid} item={inside} at={at} />
      ))}
      {flying.map(([uid, f]) => {
        const item = items[uid]
        return item ? <Interactable key={uid} item={item} at={{ x: f.ball.x, y: f.ball.y }} flying /> : null
      })}
    </>
  )
}
