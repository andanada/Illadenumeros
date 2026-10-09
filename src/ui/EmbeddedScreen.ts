import { createContext, useContext } from 'react'

/**
 * True when a game is shown inside a frame of the town (an arcade cabinet's screen) instead of as a full page:
 * `Screen` then drops its notebook page and margins. Everything else about the game is unchanged.
 */
const EmbeddedScreenContext = createContext(false)

export const EmbeddedScreenProvider = EmbeddedScreenContext.Provider
export const useEmbeddedScreen = (): boolean => useContext(EmbeddedScreenContext)
