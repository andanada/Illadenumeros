# Voz pregenerada (Azure Neural TTS)

La app lee en voz alta las preguntas en catalán **y lo que dice el poble** (peticiones de los vecinos, pistas, gracias, tarro de estrellas, regalo). Primero busca un **clip MP3 pregenerado** con la voz `ca-ES-JoanaNeural`
(`public/voice/<hash>.mp3`); si la frase no tiene clip, o el clip falla, usa la **voz del dispositivo** (Web Speech API).
El navegador **nunca** llama a Azure: solo descarga ficheros estáticos. La clave de Azure vive únicamente en `.env.speech`
(gitignorado) y la lee solo `generate.mjs`.

## Cómo funciona

```
src/core/audio/normalize.ts   normalizeSpeech() + clipKey(): UNA sola normalización, usada por la app y por el generador
src/core/audio/clips.ts       manifest (zod, una vez, perezoso) + reproducción con Web Audio
src/core/audio/speech.ts      speak(): clip -> si no hay, voz del dispositivo
scripts/voice/collect.ts      qué preguntas se pregeneran (selección dentro del presupuesto)
scripts/voice/town.ts         qué dice el poble: frases fijas, peticiones y pistas de cada lugar, jarra, regalos (+ cobertura por lugar)
scripts/voice/townSources.ts  de dónde sale cada lugar: sus habilidades y los MISMOS adaptadores que usa useErrand
scripts/voice/plan.ts         preguntas + poble juntos (lo que usa el generador)
scripts/voice/mp3.ts          validación estructural de un MP3 (frame a frame), sin dependencias
scripts/voice/budget.ts       límites y estimación de peso; falla antes de hacer ninguna petición
src/world/townVoice.ts        frases fijas del poble (gracias, «Obrim aviat!», regalo, jarra): las importan la app Y el colector
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
npm run voice:verify                    # comprueba todos los clips del disco: MP3 válido, manifest e index coherentes (sin red ni clave)
```

Opciones: `--seeds N` (muestras por habilidad, 1500 por defecto), `--limit N` (solo los N más valiosos), `--only base|town`, `--force` (rehace aunque exista),
`--interval-ms N` (pausa mínima entre peticiones, 1500 por defecto). Ante un 429 el ritmo se frena solo y se reintenta con espera
exponencial (hasta 6 intentos); un 401/403 detiene todo. Un clip que falla no detiene el resto: se reintenta en la siguiente ejecución.
Se puede interrumpir con Ctrl+C: el manifest y el contador se guardan.

Tras regenerar: `git add public/voice scripts/voice/index.json scripts/voice/usage.json`.

## Presupuesto

| Límite | Valor | Cómo se garantiza |
|---|---|---|
| Caracteres enviados a Azure (en total) | 300.000 (el plan F0 da 500.000/mes) | `usage.json` + comprobación previa: se aborta si lo acumulado + lo pendiente lo supera |
| Peso de los clips de **preguntas** en git | ~25 MB | estimación previa (`budget.ts`) y suma real de bytes durante la generación |
| Peso de los clips **del poble** en git | 13 MiB (+5 % de tolerancia al generar) | `TOWN_LIMITS` en `budget.ts`; `assertPlanWithinBudget` comprueba cada grupo por separado y los caracteres de ambos en conjunto |

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

`BYTES_BASE`/`BYTES_PER_CHAR` en `budget.ts` salen de ajustar una recta a clips reales de las preguntas (formato `audio-24khz-48kbitrate-mono-mp3`);
`TOWN_BYTES_BASE`/`TOWN_BYTES_PER_CHAR` lo mismo para el poble (`audio-16khz-32kbitrate-mono-mp3`: ~3,1 KB fijos + ~370 B por carácter, unos 2/3
del peso de las preguntas por carácter con calidad de voz casi idéntica). Si cambias de voz, formato o silencios, genera unos 200 clips
(`--only town --limit 200`), reajusta esas constantes y vuelve a ejecutar.

## El poble habla

En el poble (`src/world/**`) los vecinos, clientes y animales piden cosas y reaccionan. Todo lo que pasa por `speak()` en el poble es:

| Qué | Dónde se dice | Cómo se pregenera |
|---|---|---|
| La petición del vecino («Vull 7 més 5 pomes! Posa-les a la cistella.») | `useErrand` -> `speak(request.speech)` | `town.ts` muestrea las habilidades de cada lugar y construye la frase con los **mismos adaptadores** que `useErrand` (`requestFor`, una sola función) |
| Pistas (error o botón Ajuda) y solución | `useErrand` -> `speak(item.hints[i])` | igual, ponderadas por la probabilidad de que salgan (0,25 / 0,10 / 0,05 por petición) |
| Gracias (4 variantes) | `useErrand` | `THANKS` de `src/world/townVoice.ts`: entran siempre |
| «Obrim aviat!» (lugar en obras) | `Street.tsx` | `townVoice.ts`: entra siempre |
| Regalo del día y «Has fet tots els encàrrecs d’avui!» | `GiftReveal.tsx` | `giftMessage()`/`CHEER_LINE`; un clip por regalo posible (ropa y muebles con precio) |
| Tarro de estrellas | `StarJar.tsx` (al abrirlo) | `jarMessage()`: «ya está lleno», «falta una miqueta» y una por cada minuto 2..20 |

Los vecinos de la calle no tienen saludos ni frases ambientales con voz, y el armario no habla: no hay nada que pregenerar ahí.

**Nombres**: ninguna frase hablada del poble lleva el nombre de nadie (el nombre se muestra, no se lee), así que no hay nada que no se pueda pregenerar.
`welcomeText(name, pet)` del onboarding sí lo lleva y va por la voz del dispositivo; sin voz catalana en el dispositivo `speak()` calla
(nunca lee catalán con acento inglés). Una frase nueva con nombre debe ir por `speak()` y aceptar esa caída a la voz del dispositivo.

**Clave idéntica**: la app habla siempre con `speak(texto)`, que busca el clip con `clipKeyFor(texto)` (`normalizeSpeech` + hash); el colector
normaliza con la misma función. No hay ningún otro camino a `SpeechSynthesis` fuera de `speech.ts`.

### Cómo se reparte el presupuesto del poble

Probabilidad = un «evento» es una petición hablada, repartida a partes iguales entre los 9 lugares y las habilidades de cada lugar, por el peso
del curso (igual que las preguntas). La casa pide con el bol normal el 60 % de las veces y con los temas de la familia (toallas, pienso...) el resto.
Tarro (0,05 por petición, repartido en sus 19 minutos) y regalos (0,05, repartido entre todos) pesan según esa frecuencia. Se llena
`TOWN_LIMITS` por probabilidad por byte; lo que ya tiene clip de preguntas no se vuelve a pagar. `npm run voice:dry` imprime, por lugar:
peticiones distintas, cuántas tienen clip, **porcentaje de peticiones nuevas (semillas no vistas) leídas con clip**, el de pistas y los clips nuevos.

Los lugares con más variedad (Botiga: producto x pareja de números x modo; Mercat: decimales; Autobús) quedan con poca cobertura de peticiones:
caen a la voz del dispositivo. Palancas: subir `TOWN_LIMITS`, reducir la variedad de productos, o frases más cortas.

### Si tocas el texto del poble

Cambiar una frase de `requestLogic`/`townVoice.ts` cambia su clave: `npm run voice` genera lo nuevo (los clips viejos quedan huérfanos; `--prune` los borra).

### Verificar

`npm run voice:verify` recorre los clips del disco: MP3 estructuralmente válido (frames completos, sin bytes sobrantes), duración razonable, manifest e `index.json`
coherentes. No usa red ni la clave. Los clips del poble figuran en `index.json` bajo `formats`.

## Añadir una frase

- **Frase fija** (mensaje que la app va a decir con `speak('...')`): añádela a `FIXED_PHRASES` en `phrases.ts` y ejecuta `npm run voice`.
- **Frase fija del poble**: añádela a `ALWAYS_LINES` en `src/world/townVoice.ts` y úsala desde el componente (`speak(CONSTANTE)`); `town.ts` la recoge de ahí. Ejecuta `npm run voice`.
- **Pregunta nueva de un generador**: no hay que hacer nada especial; `collect.ts` la ve sola. Ejecuta `npm run voice:dry` para ver cómo cambia la cobertura y `npm run voice`.
- Cambiar `normalizeSpeech` cambia las claves: hay que regenerar (`--prune` para limpiar los antiguos).

## Cambiar de voz o de ritmo

Edita `VOICE`, `RATE`, `PITCH` en `ssml.ts`, ejecuta con `--force` (o borra `public/voice/`) y vuelve a calibrar el peso. El campo `voice` del manifest lo documenta.

## Offline y service worker

`vite.config.ts` precachea solo `voice/manifest.json` (pocos KB) y cachea los clips con `CacheFirst` en tiempo de ejecución (`mm-voice-clips`,
máx. 4000 entradas): un clip que el niño ya ha oído suena sin conexión; los demás vuelven a la voz del dispositivo. nginx debe servir
`/voice/*.mp3` con `Cache-Control: immutable` y `/voice/manifest.json` con `no-cache` (ver `docs/nginx-mates.conf`).
