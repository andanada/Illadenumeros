import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Mascot } from '../ui/mascot/Mascot'

interface Props {
  children: ReactNode
}
interface State {
  failed: boolean
}

/** Last safety net: a rendering error shows a friendly screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Nothing is sent anywhere (privacy): the screen below is the whole recovery path.
  }

  private restart = (): void => {
    window.location.hash = '#/map'
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="notebook grid min-h-full place-items-center p-6 text-center">
        <div className="flex max-w-md flex-col items-center gap-5">
          <Mascot character="nuvol" mood="pensa" size={140} />
          <p className="text-3xl font-bold text-brand-dark">Ups! Alguna cosa no ha anat bé.</p>
          <p className="text-xl text-ink/80">No passa res. Torna al mapa i continua jugant.</p>
          <button
            type="button"
            onClick={this.restart}
            className="sticker min-h-16 rounded-[1.6rem] bg-brand px-8 text-2xl font-bold text-white"
          >
            Torna al mapa
          </button>
        </div>
      </div>
    )
  }
}
