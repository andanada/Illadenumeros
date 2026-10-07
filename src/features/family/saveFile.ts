import { todayKey } from '../../core/progress/store'

export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled'
export type SaveFile = (blob: Blob, filename: string) => Promise<SaveOutcome>

/** `mates-magiques-AAAA-MM-DD.json`, using the local calendar day. */
export const backupFilename = (now: number): string => `mates-magiques-${todayKey(now)}.json`

/** Classic download through a temporary object URL. */
export function downloadBlob(blob: Blob, filename: string, doc: Document = document): void {
  const url = URL.createObjectURL(blob)
  const link = doc.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  doc.body.append(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before the URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError'

/**
 * On iPad/iPhone the share sheet lets the adult send the copy to Files, AirDrop or e-mail.
 * Elsewhere (or if sharing fails for any reason other than the adult cancelling) it downloads.
 */
export function createSaveFile(nav: Navigator = navigator, download: typeof downloadBlob = downloadBlob): SaveFile {
  return async (blob, filename) => {
    const file = new File([blob], filename, { type: 'application/json' })
    const data = { files: [file], title: 'Còpia de Mates Màgiques' }
    if (typeof nav.share === 'function' && nav.canShare?.(data)) {
      try {
        await nav.share(data)
        return 'shared'
      } catch (error) {
        if (isAbort(error)) return 'cancelled'
      }
    }
    download(blob, filename)
    return 'downloaded'
  }
}
