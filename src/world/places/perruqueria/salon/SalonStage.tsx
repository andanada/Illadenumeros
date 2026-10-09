import type { ReactNode } from 'react'
import { PALETTE as P } from '../../../art/palette'
import { ErrandPerson } from '../../../errands/ErrandPerson'
import { ErrandRegion, ErrandTaskArea } from '../../../errands/ErrandStage'
import type { Errand } from '../../../errands/useErrand'
import { FreePlayChair, ToolRack } from './FreePlayChair'
import { SalonDoor } from './SalonDoor'
import type { SalonState } from './salonLogic'
import type { SalonViewport } from './useSalonViewport'

export interface SalonStageProps {
  errand: Errand
  active: boolean
  pending: number
  salon: SalonState
  onSalon: (next: SalonState) => void
  onCall: () => void
  viewport: SalonViewport
  className?: string
}

const BEHIND = 0.24

function Waiting({ onCall }: { onCall: () => void }) {
  return (
    <button
      type="button"
      onClick={onCall}
      className="min-h-16 rounded-full bg-[var(--world-coral,#ff6b5b)] px-6 text-2xl font-bold text-white shadow-[var(--world-shadow-lift)] active:translate-y-0.5"
    >
      <span aria-hidden="true">🔔 </span>Fes passar un client
    </button>
  )
}

/** The styling desk in the foreground: the clips and the task stand on its top. */
function Desk({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-col">
      <div className="relative z-10 rounded-t-[1.6rem] px-3 pb-3 pt-3" style={{ background: 'linear-gradient(#FFFFFF, #FFEFF6)', boxShadow: `inset 0 10px 0 ${P.rosa.light}, inset 0 14px 0 rgba(43,36,64,0.06)` }}>
        {children}
      </div>
      <div aria-hidden="true" className="h-4" style={{ background: P.rosa.base }} />
      <div aria-hidden="true" className="h-6 sm:h-10" style={{ background: P.rosa.shade }} />
    </div>
  )
}

/**
 * The salon seen from the other side of the desk. With nobody asking, the customer sits in the chair and the
 * tools are on the trolley (free play). When someone asks for clips they stand behind the desk with their bubble.
 */
export function SalonStage({ errand, active, pending, salon, onSalon, onCall, viewport, className = '' }: SalonStageProps) {
  const { portrait, customer } = viewport
  const visible = Math.round(customer * 1.12 * (1 - BEHIND))
  const body = (
    <>
      <div className={`relative flex min-h-0 flex-1 items-end ${portrait ? 'px-2 pt-2' : 'px-4'}`}>
        <SalonDoor pending={pending} serving={active} visit={errand.visit} className={`absolute bottom-0 ${portrait ? 'right-1 h-28' : 'right-4 h-[min(62%,15rem)]'}`} />
        <div className={`relative z-10 ${portrait ? 'pr-16' : 'pr-[min(22%,10rem)]'}`}>
          {active ? <ErrandPerson errand={errand} size={customer} compact={portrait} visibleHeight={visible} /> : <FreePlayChair state={salon} onChange={onSalon} size={customer} />}
        </div>
      </div>
      <Desk>
        {active ? (
          <ErrandTaskArea errand={errand} />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ToolRack state={salon} />
            <Waiting onCall={onCall} />
          </div>
        )}
      </Desk>
    </>
  )
  const frame = `flex flex-col ${className}`
  return active ? (
    <ErrandRegion errand={errand} placeName="la Perruqueria" className={frame}>
      {body}
    </ErrandRegion>
  ) : (
    <div className={frame}>{body}</div>
  )
}
