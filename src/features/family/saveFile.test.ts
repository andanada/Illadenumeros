import { describe, expect, it, vi } from 'vitest'
import { backupFilename, createSaveFile, downloadBlob } from './saveFile'

const blob = () => new Blob(['{}'], { type: 'application/json' })
const fakeNav = (over: Partial<Navigator>): Navigator => over as Navigator

describe('backupFilename', () => {
  it('uses the local date', () => {
    expect(backupFilename(new Date(2026, 0, 5, 23, 30).getTime())).toBe('mates-magiques-2026-01-05.json')
  })
})

describe('createSaveFile', () => {
  it('shares the file when the Web Share API can share files', async () => {
    const share = vi.fn(async () => undefined)
    const download = vi.fn()
    const save = createSaveFile(fakeNav({ share, canShare: () => true }), download)
    await expect(save(blob(), 'a.json')).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }))
    expect(download).not.toHaveBeenCalled()
  })

  it('reports a cancelled share without downloading', async () => {
    const share = vi.fn(async () => Promise.reject(new DOMException('cancel', 'AbortError')))
    const download = vi.fn()
    await expect(createSaveFile(fakeNav({ share, canShare: () => true }), download)(blob(), 'a.json')).resolves.toBe('cancelled')
    expect(download).not.toHaveBeenCalled()
  })

  it('falls back to a download when sharing fails or is not available', async () => {
    const download = vi.fn()
    const failing = vi.fn(async () => Promise.reject(new DOMException('no', 'NotAllowedError')))
    await expect(createSaveFile(fakeNav({ share: failing, canShare: () => true }), download)(blob(), 'a.json')).resolves.toBe('downloaded')
    await expect(createSaveFile(fakeNav({}), download)(blob(), 'b.json')).resolves.toBe('downloaded')
    expect(download.mock.calls.map((c) => c[1])).toEqual(['a.json', 'b.json'])
  })
})

describe('downloadBlob', () => {
  it('clicks a temporary link with the filename', () => {
    const createObjectURL = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const clicks: string[] = []
    const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download)
    })
    downloadBlob(blob(), 'mates-magiques-2026-10-07.json')
    expect(clicks).toEqual(['mates-magiques-2026-10-07.json'])
    expect(document.querySelector('a[download]')).toBeNull()
    spy.mockRestore()
  })
})
