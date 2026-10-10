import type { ReactNode } from 'react'
import type { Placement } from '../../../model/types'
import type { PropInfo } from '../../../scene/SceneContext'
import { Stage } from '../../../sandbox/Stage'
import type { Block } from '../../../sandbox/logic/walkPlan'
import { FloorFixtures } from './art/fixtures'
import { FloorShell, FloorWindows } from './art/shell'
import { LightSwitch } from './LightSwitch'
import { NightLayer } from './NightLayer'
import { PiecesLayer } from './PiecesLayer'
import { FRONT_DOOR, stairsOn } from './stairs'
import { StairSpot } from './StairSpot'
import type { Walkables } from './walkables'
import { FLOOR_BY_ID, FLOOR_TOP, type FloorId, type ZoneId } from './zones'

export interface FloorStageProps {
  floor: FloorId
  height: number
  night: boolean
  lightOn: boolean
  onLight: () => void
  pieces: readonly Placement[]
  lit: readonly string[]
  decorating: boolean
  selectedUid: string | undefined
  onSelect: (uid: string) => void
  onToggleLamp: (uid: string) => void
  onDrop: (zone: ZoneId, prop: PropInfo) => void
  /** What this floor's furniture means for walking. */
  walk: Walkables
  /** Blocks of the floor the chosen character is on (the sandbox keeps one walking grid). */
  gridBlocks: readonly Block[]
  /** Bubbles of the requests (they hide themselves when their character is on another floor). */
  children?: ReactNode
}

/** One floor of the cutaway: a sandbox Stage with the house's walls, fixtures, stairs, furniture and night. */
export function FloorStage({ floor, height, night, lightOn, onLight, pieces, lit, decorating, selectedUid, onSelect, onToggleLamp, onDrop, walk, gridBlocks, children }: FloorStageProps) {
  const info = FLOOR_BY_ID[floor]
  const [left, right] = info.zones
  return (
    <div data-floor={floor} className="relative w-full" style={{ height, containerType: 'size' }}>
      <Stage
        label={info.name}
        room={floor}
        floorTop={FLOOR_TOP}
        switcher={false}
        className="overflow-visible!"
        blocks={gridBlocks}
        seats={walk.seats}
        surfaces={walk.surfaces}
        backdrop={
          <>
            <FloorShell floor={floor} left={left} right={right} night={night} />
            <FloorWindows right={right} night={night} />
            <FloorFixtures floor={floor} />
          </>
        }
      >
        {stairsOn(floor).map((s) => (
          <StairSpot key={s.id} stair={s} />
        ))}
        {floor === 'baixa' && <StairSpot stair={FRONT_DOOR} />}
        <PiecesLayer floor={floor} pieces={pieces} decorating={decorating} selectedUid={selectedUid} lit={lit} onSelect={onSelect} onToggleLamp={onToggleLamp} onDrop={onDrop} />
        <NightLayer floor={floor} night={night} lightOn={lightOn} pieces={pieces} lit={lit} />
        <LightSwitch floor={floor} name={`de ${info.name.toLowerCase()}`} on={lightOn} onToggle={onLight} />
        {children}
      </Stage>
    </div>
  )
}
