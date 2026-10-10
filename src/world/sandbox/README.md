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
