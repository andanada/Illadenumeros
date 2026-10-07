import type { VisualModel } from '../../core/ambit/types'
import { ArrayView } from './ArrayView'
import { BlocksView } from './BlocksView'
import { CompareView } from './CompareView'
import { DecimalLineView } from './DecimalLineView'
import { DotsView } from './DotsView'
import { FractionView } from './FractionView'
import { HundredGridView } from './HundredGridView'
import { MoneyView } from './MoneyView'
import { NumberLineView } from './NumberLineView'
import { ShareView } from './ShareView'
import { TenFrameView } from './TenFrameView'
import type { VisualSize } from './shared'

export interface VisualModelViewProps {
  model: VisualModel
  size?: VisualSize
  animate?: boolean
}

/** Pure renderer for every visual support model (counters, ten-frames, blocks, number line, monster, arrays, sharing, fractions, money). */
export function VisualModelView({ model, size = 'md', animate = true }: VisualModelViewProps) {
  switch (model.kind) {
    case 'none':
      return null
    case 'dots':
      return <DotsView groups={model.groups} size={size} animate={animate} />
    case 'tenFrame':
      return <TenFrameView a={model.a} b={model.b} op={model.op} size={size} animate={animate} />
    case 'blocks':
      return <BlocksView hundreds={model.hundreds} tens={model.tens} ones={model.ones} size={size} animate={animate} />
    case 'numberLine':
      return <NumberLineView from={model.from} to={model.to} start={model.start} target={model.target} size={size} animate={animate} />
    case 'compare':
      return <CompareView left={model.left} right={model.right} size={size} animate={animate} />
    case 'array':
      return <ArrayView rows={model.rows} cols={model.cols} size={size} animate={animate} />
    case 'share':
      return <ShareView total={model.total} groups={model.groups} size={size} animate={animate} />
    case 'fraction':
      return <FractionView parts={model.parts} selected={model.selected} collection={model.collection} size={size} animate={animate} />
    case 'money':
      return <MoneyView coins={model.coins} size={size} animate={animate} />
    case 'hundredGrid':
      return <HundredGridView filled={model.filled} size={size} />
    case 'decimalLine':
      return <DecimalLineView from={model.from} to={model.to} target={model.target} size={size} />
    default: {
      const unreachable: never = model
      void unreachable
      return null
    }
  }
}
