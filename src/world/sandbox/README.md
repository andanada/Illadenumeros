# Sandbox: primitives of the playable town

Everything a place needs to feel like Toca Boca: several characters you move, objects you pick up and use,
doors you walk through. Places (step S2) are built from these pieces; `Playground.tsx` is the demo room
(dev route `#/sandbox`, development builds only) that the e2e drives.

Positions are always **fractions 0..1 of the stage** (x from the left, y from the top; y is the feet).
The floor starts at `floorTop`; nothing walks above it.

## Mounting

```tsx
<CastProvider seeds={seeds} defaultRoom="sala">          // who is there (zod-validated ActorSeed[])
  <ItemsProvider defs={defs} start={items} floorTop={0.47}>  // what is there (declarative InteractableDef[])
    <Stage label="La sala" room="sala" floorTop={0.47} backdrop={<Wall />} blocks={…} seats={…} doors={…} surfaces={…} />
  </ItemsProvider>
</CastProvider>
```

- `CastProvider` props: `seeds`, `initialSelected?`, `defaultRoom?`. `useCast()` gives `state`, `select`, `walkTo(id, pt, then?)`,
  `teleport`, `sit`, `stand`, `emote(id, kind, ms?)`, `enterRoom(id, room, at)`, `snap(pt)`, `announce(text)`.
- `ActorSeed`: `{ id, kind: 'avatar'|'neighbour'|'pet', name /* «la Laia» */, at, facing?, avatar?, neighbour?, pet?, follow?, loves? }`.
  Pets with `follow` trail that actor at a distance, also through doors.
- `Stage` props: `label`, `room`, `floorTop?`, `backdrop?`, `blocks?` (furniture to walk around), `seats?`, `doors?`, `surfaces?`, `children?`, `className?`, `switcher?`.
  Floor taps walk the chosen character; arrow keys walk her a step; Tab reaches every actor, object, seat and door.
- `SeatDef { id, label, at, facing? }` (sofa, chair, bench, bus seat). `DoorDef { id, label, at, to, arrive, box? }`.
  `SurfaceDef { id, label, at, stand }` (a table where a carried thing can be put down).

## Characters

State machine per actor (`logic/actorMachine.ts`): `idle | walking | sitting | emoting`, plus an independent `carrying` slot and a `room`.
Tap an actor to choose it (it bounces and gets a ring); tap the chosen one (or «Accions») for the radial ring:
heart, laugh, wow, sleep, **Amics** (hello / hug / high five, then tap the partner), **Deixa-ho**, **Llança-ho**, **Aixeca’t**.
«Qui mous?» buttons are the keyboard/touch alternative to tapping. With a thing in hand, tapping another character **gives** it.
Reduced motion: walking teleports with a poof, no loops.

## Objects

`InteractableDef` (declarative, `defs.ts`): `{ id, label, art, aspect?, height, pickup?, tool?, use?, container?, surprise?, surpriseTaps?, surpriseOptions?, toss? }`.
`art(state)` draws SVG in a 100-wide box, feet at the bottom centre. State is `{ stage, open, charge, revealed, held }`.

- `pickup`: hold pose, follows the actor, crosses doors, put down from the ring or on a surface.
- `use`: `UseChain` of stages, each reached by tapping the right `tool` onto the target (fruit: esponja → ganivet → olla → plat).
- `container`: tap to open/close; contents live inside and can be taken out / put back while open.
- `surprise`: `surpriseTaps` taps reveal one of `surpriseOptions`, deterministic from the object's uid.
- `toss`: flick it (or «Llança-ho»): arc, bounces, rests (`logic/toss.ts`, no library).

Every action is announced in Catalan through the stage's `aria-live` region.

## Anchor (for the requests system)

```tsx
<Anchor actorId="pilar" state="waiting" number={3} icon={<Muffin />} label="La Pilar vol 3 magdalenes" onActivate={…} />
```

| prop | type | |
|---|---|---|
| `state` | `'calm' \| 'waiting' \| 'done'` | calm: soft white bob · waiting: warm, slightly livelier · done: green with a tick |
| `onActivate` | `() => void` | tap / Enter / Space. Ignoring it is always fine |
| `label` | `string` | accessible name (Catalan) |
| `icon?` | `ReactNode` | small picture in the bubble |
| `number?` | `number \| string` | shown next to the icon |
| `actorId?` | `string` | hangs over this actor's head and follows them (hidden while they are in another room) |
| `at?` | `{x, y}` | or over a point (fractions of the nearest positioned ancestor) |
| `lift?` | `number` | extra px above the head |
| `className?` | `string` | |

It never flashes or shakes, is a real `<button>` (≥ 56 px), and stops bobbing with `prefers-reduced-motion`.

## Street (src/world/scene/street)

`<Street>` keeps its `onEnter(placeId, from)` contract. The avatar now walks: tap the ground, tap a door (she walks there and goes in;
if she is already there it opens at once), hold an arrow (a quick tap is one stride), or use ← → on the focused street. The camera
glides after her; dragging still pans it. New optional prop `carrying` (SVG for her hand) keeps what she holds in the street.

## Doing maths in the world (objects, zones, `useRequestTask`)

### ItemsApi additions (all validated with zod; unknown def / taken uid / no room → `undefined`/`false`, malformed input throws)

| call | |
|---|---|
| `spawn(defId, { room, at, uid?, qty?, zone? }) => string \| undefined` | new object; `qty` only for `stackable` defs; `zone` puts it in the zone's next free slot (`undefined` if full / not accepted) |
| `place(uid, { room, at }) => boolean` | moves it anywhere (leaves its zone, empties a hand) |
| `putInZone(uid, zoneId) => boolean` | next free slot (or merges into the stack there); announces and fires `onDrop` |
| `remove(uid) => boolean` / `consume(uid) => boolean` | remove for good / use up with a poof (stays as `gone`, counts nowhere) |
| `count({ zone?, room?, def? }) => number`, `query(room, defId?) => ItemState[]` | read the **fresh** state, also right after a `spawn` in the same event |
| `onChange(listener) => unsubscribe`, `useItems(selector)`, `useZoneCount(zoneId, defId?)` | observe zone contents (`ChangeEvent { zone, counts, total }`) |
| `tapZone(zoneId)` | tap alternative: the chosen character walks over and puts what she carries in |

`ItemsProvider zones={ZoneDef[]}`: `{ id, room, rect, label /* «la cistella» */, accepts?(defId), capacity? (10), cols? (5), showCount? (false), quiet?, announceCount? (true), onDrop?, onChange? }`.
Slots are a neat ten-frame (`logic/zones.ts`); the zone shows no number unless `showCount`. While she carries something the zone becomes a button
(«Deixa-ho a la cistella», focusable, Enter); tapping a thing in a zone takes it out. Announcements: «Has posat una poma a la cistella: ara hi ha 7.»
`InteractableDef` gains `single` («una poma»), `stackable`, `quantityBadge`. Picking from a stack takes one. Zone members carry `data-in="<zone>"`; the zone has `data-count`.

### `useRequestTask(errand, spec) => { state, count, expected, submit(), hint }`

`errand` is a real `Errand` (only `item, phase, tries, hintText, submit` are used, so a fake fits). `spec` (`RequestTaskSpec`, zod):
`{ zone, def?, source?: { def, room, at }, supply? (expected + 2), expected? (item.answer, else operands), giveTo?: actorId, active? (true) }`.

- lays out `supply` source objects as a pile; the child carries them into `zone`; `count` = what lies there (of `def`);
- `submit()` answers `errand.submit(choiceForValue(String(count), item))` — same attempt / Leitner / fluency pipeline; no-op while `count === 0` or not `asking`;
- a wrong count: everything pops back to the pile (no red anything), `hint` shows the ladder text, `state` returns to `empty`; after the last try (`shown`) the solution is laid out;
- right (`thanks`): with `giveTo` the things are consumed, that actor gets a heart and «Has donat 3 a la Pilar.»
- `state`: `empty | counting | checking | done | shown`.

```tsx
const errand = useErrand({ gameId, skillIds, adapters, onSolved })        // unchanged flow
const task = useRequestTask(errand, {
  zone: 'cistella', def: 'poma', source: { def: 'poma', room: 'botiga', at: { x: 0.3, y: 0.9 } },
  giveTo: 'fatima', active: open,                                           // open: this request is on
})
return (
  <>
    <Anchor actorId="fatima" state={task.state === 'done' ? 'done' : 'waiting'} number={task.expected} label={errand.request.text} onActivate={openRequest} />
    <button disabled={task.state !== 'counting'} onClick={() => void task.submit()}>Comprova</button>
    {task.hint && <p>{task.hint}</p>}
  </>
)
```

### Stage / cast fixes

- `Stage passive`: no footsteps, pet-follow, aria-live, ring, puffs or switcher (the other floors of a house). `Stage petFree={Rect[]}`: pets never step there (seats, doors and zones are added automatically).
- Walking grids are per room: `Stage` calls `setFloor(blocks, floorTop, room)`; an actor walks on the grid of the room she is in. `walkTo` right after `enterRoom` sees the new room at once (the cast state is mirrored synchronously).
- `ActorSwitcher room? filter?(id)`. Seats, doors and spots are drawn above pets they overlap (`petLayer`); persons keep their order.
