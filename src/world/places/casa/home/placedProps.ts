export const PLACED_KIND = 'moble-col·locat'
export const placedPropId = (uid: string): string => `col:${uid}`
export const uidOfProp = (id: string): string => id.replace(/^col:/, '')
