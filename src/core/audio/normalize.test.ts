import { clipKey, clipKeyFor, normalizeSpeech } from './normalize'

describe('normalizeSpeech', () => {
  it.each([
    ['5 − 3', '5 menys 3'],
    ['7 × 8', '7 per 8'],
    ['12 ÷ 4', '12 entre 4'],
    ['12 : 4 = ?', '12 entre 4 és igual a?'],
    ['? : 3 = 4', '? entre 3 és igual a 4'],
    ['3 + 4', '3 més 4'],
    ['9 - 4', '9 menys 4'],
    ['2² i 2³', '2 al quadrat i 2 al cub'],
    ['3 < 5 i 5 > 3', '3 és menor que 5 i 5 és major que 3'],
  ])('expands %s', (input, expected) => {
    expect(normalizeSpeech(input)).toBe(expected)
  })

  it('keeps prose colons, hyphenated words and the question mark', () => {
    expect(normalizeSpeech('Mira: això és un bon-dia?')).toBe('Mira: això és un bon-dia?')
  })

  it('reads money, percentages and units in words', () => {
    expect(normalizeSpeech('Costa 13,10 € i 1 €.')).toBe('Costa 13,10 euros i 1 euro.')
    expect(normalizeSpeech('11 € i 2,1 €')).toBe('11 euros i 2,1 euros')
    expect(normalizeSpeech('Un descompte del 10 %. Quant?')).toBe('Un descompte del 10 per cent. Quant?')
    expect(normalizeSpeech('9,4 L i 61 m i 50 cts')).toBe('9,4 litres i 61 metres i 50 cèntims')
    expect(normalizeSpeech('3 kg i 2 km')).toBe('3 quilos i 2 quilòmetres')
  })

  it('does not mistake the word "més" or a letter for a unit', () => {
    expect(normalizeSpeech('Quant fa 1 més 6?')).toBe('Quant fa 1 més 6?')
    expect(normalizeSpeech('Hi ha 3 magdalenes')).toBe('Hi ha 3 magdalenes')
  })

  it('drops emoji and collapses whitespace', () => {
    expect(normalizeSpeech('  Molt   bé! ✨ ')).toBe('Molt bé!')
    expect(normalizeSpeech('Hola ⭐️ !')).toBe('Hola!')
  })

  it('is idempotent', () => {
    const once = normalizeSpeech('Quant fa 5 − 3 = ? ✨ 10 %')
    expect(normalizeSpeech(once)).toBe(once)
  })
})

describe('clipKey', () => {
  it('is 12 lowercase hex digits and stable', () => {
    expect(clipKey('Quant fa 3 més 4?')).toMatch(/^[0-9a-f]{12}$/)
    expect(clipKey('Quant fa 3 més 4?')).toBe(clipKey('Quant fa 3 més 4?'))
  })

  it('differs for different texts and has no collisions across a numeric family', () => {
    const keys = new Set<string>()
    for (let a = 0; a < 60; a++) for (let b = 0; b < 60; b++) keys.add(clipKey(`Quant fa ${a} per ${b}?`))
    expect(keys.size).toBe(3600)
  })

  it('keys a raw phrase through the normalisation', () => {
    expect(clipKeyFor('5 − 3')).toBe(clipKey('5 menys 3'))
  })
})
