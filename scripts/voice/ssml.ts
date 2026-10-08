/** Azure Neural TTS request settings. Only the generator uses this; the browser never calls Azure. */
export const VOICE = 'ca-ES-JoanaNeural'
export const LANG = 'ca-ES'
/** A little slower than normal and slightly brighter: clear for a 9-year-old, friendly, not babyish. */
export const RATE = '-5%'
export const PITCH = '+3%'
export const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3'

const XML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }

export const escapeXml = (text: string): string => text.replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c)

/**
 * Azure pads every clip with about a second of silence (7 KB at 48 kbit/s). Trimming it keeps the payload small
 * and makes the voice start the instant the child taps. Exact silences are supported by the neural voices.
 */
const LEADING_SILENCE = '20ms'
const TAILING_SILENCE = '60ms'

/** SSML for one (already normalised) phrase. */
export function buildSsml(text: string): string {
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${LANG}">` +
    `<voice name="${VOICE}"><mstts:silence type="Leading-exact" value="${LEADING_SILENCE}"/>` +
    `<mstts:silence type="Tailing-exact" value="${TAILING_SILENCE}"/>` +
    `<prosody rate="${RATE}" pitch="${PITCH}">${escapeXml(text)}</prosody></voice></speak>`
  )
}
