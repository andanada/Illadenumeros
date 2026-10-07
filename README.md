# Illa dels Números — Mates Màgiques

App web instalable (PWA) para aprender a **sumar, restar, multiplicar y dividir jugando**, con personajes originales y todo el texto en **catalán**. Pensada para una niña de 4.º de primaria cuyo nivel real de cálculo es el de 1.º: el diagnóstico empieza por "sumar hasta 10" y sube hasta donde llegue.

Los contenidos siguen el currículum oficial de Catalunya (Decret 175/2022, sabers de cicle inicial y mitjà). Hoy cubre de **1.º a 4.º**; 5.º está previsto.

## Qué hace

- **Diagnóstico sin notas** ("L'Expedició del Mapa"): coloca a la niña en el grafo de habilidades sin enseñarle nunca una puntuación.
- **Mapa "L'Illa dels Números"** con una región por curso, paradas con estrellas y misión diaria de unos 12 minutos.
- **8 juegos**: Bombolles Amigues del 10, El Marc Màgic, Cursa a la Recta, Duel Llampec, El Repte de l'Illa, La Fleca de les Files, Repartim Llaminadures y La Botiga de la Pluja.
- **Errores sin castigo**: escalera de pistas de tres pasos, nada de vidas ni cruces rojas, y la solución se muestra al final.
- **Álbum de pegatinas**, pétalos y 5 personajes originales en SVG animado.
- **Funciona sin conexión y sin cuenta**: el progreso se guarda en el propio dispositivo (IndexedDB).

## Cómo aprende (motor en `src/core/engine`)

| Pieza | Qué hace |
|---|---|
| Repaso espaciado | Cada hecho (p. ej. `7×8`) vive en una caja de Leitner de 0 a 5; vuelve a salir a 1, 2, 4, 9 o 21 días. |
| Dominio por habilidad | Mezcla de precisión y fluidez; "dominada" exige muchos intentos en varias sesiones y no se pierde por un solo fallo. |
| Concreto → pictórico → abstracto | Cada habilidad sube de etapa con 8 aciertos de 10 y baja tras dos errores seguidos. |
| Selector de sesión | ~70 % repaso, 20 % consolidación, ≤10 % novedad, máximo 3 hechos nuevos a la vez, con objetivo de acierto del 75–85 %. |
| Diagnóstico | 9 anclas (de `A4` a `D2`), 3 preguntas por ancla, tope de 30. |
| Generadores | Funciones puras con semilla; las respuestas incorrectas salen de errores típicos (olvidar la llevada, tabla vecina, multiplicar tratado como sumar…). |

El tiempo de respuesta se mide para la fluidez, pero **la niña nunca lo ve**.

## Puesta en marcha

Requisitos: Node 22 o superior.

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # para abrirla desde una tablet en la misma red
```

| Comando | Para qué |
|---|---|
| `npm run build` | Compila para producción (incluye la PWA). |
| `npm test` | Tests unitarios y de componentes (Vitest). |
| `npm run coverage` | Tests con informe de cobertura (umbral 80 %). |
| `npm run typecheck` | Comprobación de tipos. |
| `npm run lint` | Linter (Oxlint, prohíbe `console.*`). |
| `npm run e2e` | Pruebas de extremo a extremo (Playwright: escritorio, iPad y móvil). |

La primera vez que se ejecuten las pruebas E2E: `npx playwright install chromium`.

## Estructura

```
src/core/       motor independiente de la asignatura (engine, progress, storage, audio)
src/ambits/     contenidos por ámbito; hoy solo `mates` (habilidades, hechos, generadores)
src/features/   pantallas: primer uso, diagnóstico, mapa, misión, álbum
src/games/      los juegos
src/ui/         sistema de diseño: botón-pegatina, personajes, vistas visuales
e2e/            pruebas de Playwright
```

El motor solo conoce el contrato `AmbitModule` (`src/core/ambit/types.ts`), así que otras asignaturas (lengua, etc.) se añadirán como nuevos ámbitos sin tocarlo.

## Privacidad

No hay servidor, cuentas, analíticas ni peticiones externas. Lo único que se guarda es el nombre de pila que escribe la niña y su progreso, en el navegador. La tipografía va empaquetada. Las imágenes de personajes y pegatinas son originales; no se incluye ningún material con derechos de terceros.

## Despliegue

La app es estática: `npm run build` genera `dist/`, que se sirve con nginx detrás de HTTPS, en la raíz de un dominio o en un subcamino (`base: './'` + `HashRouter`). Guía completa (caché, compresión, cabeceras de seguridad, HTTPS y actualizaciones) en [`docs/DEPLOY.md`](docs/DEPLOY.md), con plantillas en `docs/nginx-mates.conf` y `docs/nginx-mates-security.conf`.

- `npm run icons`: regenera `public/icon.svg` y los PNG de `public/icons/` (app, maskable, iOS y favicon) con `scripts/generate-icons.mjs`.
- `npm run e2e:pwa`: compila y prueba el service worker, el modo sin conexión, el subcamino y el aviso de actualización.
- CI en `.github/workflows/ci.yml` (tipos, lint, cobertura, build y E2E); no despliega nada.

## Estado y siguientes pasos

- Hecho: 1.º a 4.º, 8 juegos, diagnóstico, misión diaria, álbum, PWA, pruebas unitarias y E2E.
- Previsto: región de 5.º (decimales, porcentajes, descuentos), sincronización en la nube con panel para la familia, voz catalana pregenerada y subir una versión pública.
- Pendiente de ajustar tras probarla con la niña: ritmo y dificultad.
