# Voz pregenerada (Azure Neural TTS)

La app lee en voz alta las preguntas en catalán. Primero busca un **clip MP3 pregenerado** con la voz `ca-ES-JoanaNeural`
(`public/voice/<hash>.mp3`); si la frase no tiene clip, o el clip falla, usa la **voz del dispositivo** (Web Speech API).
El navegador **nunca** llama a Azure: solo descarga ficheros estáticos. La clave de Azure vive únicamente en `.env.speech`
(gitignorado) y la lee solo `generate.mjs`.

## Cómo funciona

```
src/core/audio/normalize.ts   normalizeSpeech() + clipKey(): UNA sola normalización, usada por la app y por el generador
src/core/audio/clips.ts       manifest (zod, una vez, perezoso) + reproducción con Web Audio
src/core/audio/speech.ts      speak(): clip -> si no hay, voz del dispositivo
scripts/voice/collect.ts      qué frases se pregeneran (selección dentro del presupuesto)
scripts/voice/budget.ts       límites y estimación de peso; falla antes de hacer ninguna petición
scripts/voice/ssml.ts         SSML: ca-ES, rate -5 %, pitch +3 %, silencios recortados
scripts/voice/phrases.ts      frases fijas (feedback, ánimo, celebración, onboarding, instrucciones)
scripts/voice/generate.mjs    llama a Azure, idempotente, escribe public/voice/
scripts/voice/index.json      clave -> texto (auditoría y regeneración; no se publica)
scripts/voice/usage.json      caracteres facturados acumulados (el guardián del presupuesto)
public/voice/manifest.json    {version, voice, clips: [claves]}, lo único que descarga la app antes de un clip
```

La clave de un clip son 12 dígitos hex de un hash de 48 bits del **texto normalizado** (`× -> per`, `− -> menys`, `: -> entre`,
`= -> és igual a`, `€ -> euros`, `% -> per cent`, `L -> litres`, emojis fuera...). Como la app y el generador usan la misma función,
las claves coinciden siempre. `collect.ts` aborta si dos textos distintos tuvieran la misma clave.

## Regenerar

```bash
npm run voice:dry                       # cuentas, MB estimados y cobertura; no lee la clave ni hace peticiones
npm run voice                           # genera lo que falte (idempotente: salta los clips que ya existen)
node scripts/voice/generate.mjs --prune # además borra los clips que ya no están en la selección
```

Opciones: `--seeds N` (muestras por habilidad, 1500 por defecto), `--limit N` (solo los N más valiosos), `--force` (rehace aunque exista),
`--interval-ms N` (pausa mínima entre peticiones, 1500 por defecto). Ante un 429 el ritmo se frena solo y se reintenta con espera
exponencial (hasta 6 intentos); un 401/403 detiene todo. Un clip que falla no detiene el resto: se reintenta en la siguiente ejecución.
Se puede interrumpir con Ctrl+C: el manifest y el contador se guardan.

Tras regenerar: `git add public/voice scripts/voice/index.json scripts/voice/usage.json`.

## Presupuesto

| Límite | Valor | Cómo se garantiza |
|---|---|---|
| Caracteres enviados a Azure (en total) | 300.000 (el plan F0 da 500.000/mes) | `usage.json` + comprobación previa: se aborta si lo acumulado + lo pendiente lo supera |
| Peso de los clips en git | ~25 MB | estimación previa (`budget.ts`) y suma real de bytes durante la generación |

A 48 kbit/s un segundo de voz son 6 KB, así que **el límite que manda es el peso, no los caracteres**.

### Cómo se elige qué se pregenera

El universo (todo lo que pueden producir los generadores) tiene decenas de miles de frases: los números y los problemas casi nunca se repiten.
Por eso no se enumera todo, se **ordena por probabilidad de acierto por byte**:

1. Las frases fijas (`phrases.ts`) entran siempre.
2. Para cada habilidad se generan muchas preguntas con semillas deterministas. Cuántas veces sale cada frase, ponderada por curso
   (1.º 0,6 - 2.º 0,8 - 3.º 1 - 4.º y 5.º 1,3), es su probabilidad de aparecer.
3. Se toman las frases con mayor probabilidad por byte estimado hasta llenar el presupuesto. Las habilidades de hechos (sumas hasta 20,
   tablas, divisiones) y los rangos pequeños quedan completos; los problemas con texto largo quedan para la voz del dispositivo.

`npm run voice:dry` imprime la **cobertura real por habilidad**, medida con semillas que la selección nunca vio.

### Calibración del peso

`BYTES_BASE`/`BYTES_PER_CHAR` en `budget.ts` salen de ajustar una recta a clips reales (formato `audio-24khz-48kbitrate-mono-mp3`): unos 5,8 KB
fijos + 390 B por carácter. Si cambias de voz, formato o silencios, genera unos 200 clips (`--limit 200`), reajusta esas constantes y vuelve a ejecutar.
Palanca si hace falta más cobertura: `audio-16khz-32kbitrate-mono-mp3` en `ssml.ts` reduce el peso a ~2/3 (algo menos de calidad).

## Añadir una frase

- **Frase fija** (mensaje que la app va a decir con `speak('...')`): añádela a `FIXED_PHRASES` en `phrases.ts` y ejecuta `npm run voice`.
- **Pregunta nueva de un generador**: no hay que hacer nada especial; `collect.ts` la ve sola. Ejecuta `npm run voice:dry` para ver cómo cambia la cobertura y `npm run voice`.
- Cambiar `normalizeSpeech` cambia las claves: hay que regenerar (`--prune` para limpiar los antiguos).

## Cambiar de voz o de ritmo

Edita `VOICE`, `RATE`, `PITCH` en `ssml.ts`, ejecuta con `--force` (o borra `public/voice/`) y vuelve a calibrar el peso. El campo `voice` del manifest lo documenta.

## Offline y service worker

`vite.config.ts` precachea solo `voice/manifest.json` (pocos KB) y cachea los clips con `CacheFirst` en tiempo de ejecución (`mm-voice-clips`,
máx. 4000 entradas): un clip que el niño ya ha oído suena sin conexión; los demás vuelven a la voz del dispositivo. nginx debe servir
`/voice/*.mp3` con `Cache-Control: immutable` y `/voice/manifest.json` con `no-cache` (ver `docs/nginx-mates.conf`).
