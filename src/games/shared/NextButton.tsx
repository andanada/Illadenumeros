import { Button } from '../../ui/Button'

export function NextButton({ last, onClick }: { last: boolean; onClick: () => void }) {
  return (
    <Button variant="ok" big tilt={-2} onClick={onClick} className="shrink-0">
      {last ? 'Acabar ✨' : 'Següent →'}
    </Button>
  )
}
