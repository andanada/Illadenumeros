# Despliegue de Mates Màgiques

La web es 100 % estática: `npm run build` genera `dist/` y basta con servirlo con nginx detrás de HTTPS. Sin cuenta no hace falta servidor ni variables de entorno, y la web no hace peticiones externas. Las cuentas de familia y la sincronización las da la API de `server/` (Fastify + SQLite, ver `server/README.md`), detrás del mismo nginx en `/api/`.

## 1. Generar el build

```bash
npm ci
npm run build        # tsc -b + vite build (incluye el service worker)
```

`dist/` contiene `index.html`, `assets/` (con hash en el nombre; las librerías van en trozos propios `vendor-react`, `vendor-motion`, `vendor-zod` y `vendor-dexie`, definidos en `vite.config.ts` con `build.rolldownOptions.output.codeSplitting`, así que un cambio solo de la app no invalida su caché), `icons/`, `icon.svg`, `manifest.webmanifest`, `sw.js` y `workbox-*.js`.

### Raíz del dominio o subcamino

El build usa `base: './'` (todas las URLs son relativas) y el router es `HashRouter` (`#/map`). Por eso **el mismo `dist/` funciona sin recompilar** en `https://dominio/` y en `https://dominio/mates/`: el service worker toma como ámbito la carpeta donde está `sw.js`, y el manifest usa `start_url: './'` y `scope: './'`. Está comprobado con `npm run e2e:pwa` (raíz con `vite preview`, subcamino `/mates/` con un servidor estático).

Un subcamino exige la barra final: `https://dominio/mates` debe redirigir a `https://dominio/mates/` (si no, las URLs relativas apuntan a la carpeta equivocada).

### Iconos

Los PNG están versionados en `public/icons/`. Para regenerarlos tras cambiar el dibujo:

```bash
npm run icons        # scripts/generate-icons.mjs (sharp); reescribe public/icon.svg y public/icons/*.png
```

Archivos: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (fondo a sangre, contenido dentro del 80 % central), `apple-touch-icon-180.png` (iPad/iPhone ignoran el SVG) y `favicon-32.png`.

## 2. nginx

Plantillas listas:

- `docs/nginx-mates.conf`: bloque `server` (HTTP a HTTPS, compresión, caché, `try_files`).
- `docs/nginx-mates-security.conf`: cabeceras de seguridad. Copiar a `/etc/nginx/snippets/mates-security.conf`.

```bash
sudo mkdir -p /var/www/mates && sudo rsync -a --delete dist/ /var/www/mates/
sudo cp docs/nginx-mates-security.conf /etc/nginx/snippets/mates-security.conf
sudo cp docs/nginx-mates.conf /etc/nginx/sites-available/mates   # editar server_name y certificados
sudo ln -s /etc/nginx/sites-available/mates /etc/nginx/sites-enabled/mates
sudo nginx -t && sudo systemctl reload nginx
```

### Caché (lo importante para que lleguen las actualizaciones)

| Ruta | Cabecera | Motivo |
|---|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` | Nombre con hash: nunca cambia con el mismo nombre. |
| `index.html` | `no-cache` | Decide qué JS/CSS se carga. |
| `sw.js`, `workbox-*.js`, `registerSW.js` | `no-cache` | Si el navegador cachea el SW, no ve las versiones nuevas. |
| `manifest.webmanifest` | `no-cache` | Cambios de iconos o nombre. |
| `icons/*`, `icon.svg` | `public, max-age=604800` | Sin hash; el SW los precachea igualmente. |
| `/voice/<hash>.mp3` | `public, max-age=31536000, immutable` | El nombre es un hash del contenido (12 hex): nunca cambia. |
| `/voice/manifest.json` | `no-cache` | Cambia al regenerar la voz. |

`no-cache` no significa "no guardar": el navegador revalida con ETag y recibe un 304 barato.

#### Voz pregenerada: caché larga en `/voice/*.mp3`

Los ~2.000 clips (25 MB) se llaman `<12 hex>.mp3` y su nombre es un hash del contenido, así que se pueden cachear un año. La plantilla ya lo hace con `location /voice/`; si prefieres limitarlo solo a los clips con hash (y no a cualquier otro fichero que algún día cuelgue de `/voice/`), usa esta variante, **antes** del bloque de `manifest.json`:

```nginx
location ~ ^/voice/[0-9a-f]{12}\.mp3$ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    include snippets/mates-security.conf;   # add_header en un location anula los heredados
    access_log off;                         # un clip por frase: ruido en el log
    try_files $uri =404;                    # 404 real, nunca index.html
}
location = /voice/manifest.json {
    add_header Cache-Control "no-cache" always;
    include snippets/mates-security.conf;
    try_files $uri =404;
}
```

No añadir `gzip` para `audio/mpeg`: el mp3 ya va comprimido. Comprobar con `curl -sI https://dominio/voice/<hash>.mp3 | grep -i cache-control`. El service worker los guarda a medida que se oyen (`mm-voice-clips`), así que esta caché solo ahorra la primera descarga por dispositivo.

### Compresión

`gzip` activado en la plantilla (JS, CSS, JSON, SVG, manifest). Brotli (`ngx_brotli`) está comentado: descomentar solo si el módulo está instalado (`nginx -V 2>&1 | grep brotli`). Los PNG y WOFF2 ya van comprimidos; no se vuelven a comprimir.

### `try_files`

Las rutas son hash (`#/map`), el servidor solo ve `/`; **no hace falta fallback a `index.html`**. De hecho es contraproducente en `/assets/`: si un navegador pide un chunk de una versión anterior que ya no existe, debe recibir un 404 real y no un `index.html` con 200 y `text/html` (rompe la carga de módulos). La plantilla usa `try_files $uri =404` en `/assets/` y `try_files $uri $uri/ =404` en `/`.

### Cabeceras de seguridad

- `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
  - `'unsafe-inline'` solo en estilos: React y Motion escriben atributos `style` en línea (animaciones). No hay scripts en línea ni hosts externos (la fuente Fredoka va empaquetada).
  - Verificado recorriendo onboarding, diagnóstico, mapa, misión, álbum y varios juegos con esta CSP. La única infracción registrada es la sonda `Function('')` de Zod (`script-src` por eval): la propia librería la captura y no tiene efecto funcional. Se evita del todo moviendo `z.config({ jitless: true })` a un módulo que se importe antes que el resto en `src/main.tsx`.
- `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`.
- `Permissions-Policy`: desactiva cámara, micrófono, geolocalización, pagos, USB y Bluetooth. La síntesis de voz y el audio no dependen de ninguno de estos permisos.
- `Cross-Origin-Opener-Policy: same-origin` y `Strict-Transport-Security` (solo tiene efecto sobre HTTPS).

**Trampa de nginx**: `add_header` en un `location` anula todos los `add_header` heredados del `server`. Por eso la plantilla hace `include snippets/mates-security.conf;` dentro de cada `location` que define su propio `Cache-Control`. Comprobar con `curl -sI https://dominio/assets/xxx.js`.

### HTTPS

- Imprescindible: los service workers y la instalación como app solo funcionan en contextos seguros (HTTPS, o `localhost`).
- Certificado gratuito con Let's Encrypt: `sudo certbot --nginx -d mates.ejemplo.cat` (añade los `ssl_*` y la redirección). Si ya usas la plantilla con las rutas del certificado escritas, basta `certbot certonly --nginx`.
- El certificado debe ser válido y de una CA de confianza: con uno autofirmado el SW no se registra en iPad.
- HSTS ya está en el snippet; mantenlo solo cuando HTTPS funcione bien (es difícil de revertir).
- En iPad/Safari, "Añadir a pantalla de inicio" usa `apple-touch-icon-180.png` y el título de `apple-mobile-web-app-title`.

## 3. Cómo llegan las actualizaciones

- `registerType: 'prompt'`: el service worker nuevo se descarga en segundo plano y queda **en espera**; la app muestra "Hi ha coses noves!" (`UpdatePrompt`) y solo al pulsar "Actualitzar" se activa y recarga. Nunca interrumpe una partida.
- El navegador busca un `sw.js` nuevo al abrir o navegar la app y, como mucho, cada 24 h. Por eso `sw.js` debe servirse con `no-cache`.
- `cleanupOutdatedCaches: true` borra las cachés de versiones anteriores al activarse el SW nuevo. `index.html` está en el precaché y se sirve como `navigateFallback`.
- `clientsClaim: true` solo afecta a la primera instalación (la página pasa a estar controlada sin recargar, así que ya funciona offline en la primera visita). Una actualización sigue esperando a la confirmación.
- Los datos de la niña (IndexedDB) no se tocan al actualizar.

## 4. Comprobaciones tras desplegar

```bash
curl -sI https://mates.ejemplo.cat/                 | grep -iE 'cache-control|content-security|x-content'
curl -sI https://mates.ejemplo.cat/sw.js            | grep -i cache-control      # no-cache
curl -sI https://mates.ejemplo.cat/assets/<hash>.js | grep -iE 'cache-control|content-encoding'
```

En Chrome: DevTools, Application, Manifest (sin errores, instalable) y Service Workers (activado y en ejecución).

## 5. Pruebas de la PWA en local

```bash
npm run e2e:pwa      # build + Playwright (proyecto `pwa`): manifest e iconos, SW + offline, subcamino /mates/, flujo de actualización
npx vite preview     # sirve dist/ en :4173 para probar a mano
```

`npm run e2e` (Playwright contra el servidor de desarrollo, en escritorio, iPad y móvil) no cambia.

## 6. Cuentas y sincronización en local

```bash
npm ci && npm ci --prefix server   # `tsc -b` compila también server/src: hacen falta las dos instalaciones
npm run e2e:sync                   # compila server/ y ejecuta e2e/sync.spec.ts contra la API real
```

`e2e:sync` arranca la API con una base de datos temporal nueva y un código de invitación solo de pruebas (`e2e/syncEnv.ts`), más Vite con proxy a `/api`. No toca datos reales. Las pruebas del servidor son `npm test --prefix server` (y `npm run coverage --prefix server`, umbral 85 %).

## 7. Página de privacidad

La web incluye `/#/privacitat` (catalán, para las familias; enlazada desde la pantalla de inicio y desde la sección de la cuenta). **Antes de publicar**, poner un buzón real en la constante `PRIVACY_CONTACT_EMAIL` de `src/features/privacy/contact.ts`. Mientras valga `contacte@exemple.cat` la página muestra un aviso visible para quien publica. Si cambian los plazos de retención del servidor (`SESSION_TTL_DAYS`, `PURGE_AFTER_DAYS`, `AUDIT_RETENTION_DAYS`), actualizar también el texto de `src/features/privacy/PrivacyBlocks.tsx`.

## 8. Integración continua

`.github/workflows/ci.yml` (no despliega nada): el trabajo `verify` instala raíz y `server/`, y ejecuta tipos, lint, cobertura, lint, tipos y cobertura del servidor y el build; el trabajo `e2e` ejecuta `npm run e2e`, `npm run e2e:pwa` y `npm run e2e:sync` con Chromium. La caché de npm usa los dos `package-lock.json`.

## 9. Sitio de previsualización y puesta en producción del poble

El poble (rama `poble`, `src/world/**`) se prueba primero en un **sitio de previsualización** aparte, y solo después sustituye a la web de producción.

### Sitio de previsualización

- Un subdominio propio (p. ej. `poble.ejemplo.cat`) con su propio `server` de nginx, su certificado y su propio directorio (p. ej. `/var/www/mates-poble/`), copiado de `docs/nginx-mates.conf` con las mismas cabeceras y cachés.
- **Sin `/api`**: no se define `location /api/`. Sin API la web funciona como siempre sin cuenta (los datos de cada jugador se quedan en su dispositivo) y ninguna prueba del poble puede tocar la base de datos de las familias. El IndexedDB del subdominio es distinto del de producción: los jugadores de ahí no se mezclan con los reales.
- Publicar: `npm ci && npm run build` en la rama `poble` y `rsync -a --delete dist/ /var/www/mates-poble/`. Conviene añadir `X-Robots-Tag: noindex` en ese `server` para que no se indexe.
- La CI (`.github/workflows/ci.yml`) también corre en cada push a `poble`, así que el build que se publica ya ha pasado tipos, lint, cobertura y e2e.

### Llevar el poble a producción

El orden importa porque el cliente nuevo habla con la API nueva (documento `world` en la sincronización):

1. **Copia de seguridad** de la base de datos del servidor (`DATABASE_PATH`, fichero SQLite) y del `dist/` actual: `sudo rsync -a --delete /var/www/mates/ /var/www/mates.prev/` (o `cp -a`). Esa carpeta es el punto de vuelta atrás.
2. **Servidor primero**: desplegar `server/` con la migración `005_world_doc_kind.sql` (`npm ci --prefix server && npm run build --prefix server`, reiniciar el servicio; las migraciones se aplican al arrancar, ver `server/README.md`). Comprobar `curl -s https://dominio/api/health`. Un cliente antiguo sigue funcionando con la API nueva.
3. **Cliente después**: `npm run build` desde la rama del poble ya fusionada y `sudo rsync -a --delete dist/ /var/www/mates/`. Los navegadores reciben el service worker nuevo en segundo plano y los niños ven "Hi ha coses noves!" cuando les toca (sección 3); ninguna partida se interrumpe.
4. Comprobar las cabeceras (sección 4) y entrar con un jugador de prueba: el poble debe cargar, y la sincronización con la cuenta, funcionar.

### Vuelta atrás (rollback)

- **Cliente**: `sudo rsync -a --delete /var/www/mates.prev/ /var/www/mates/` y listo. El service worker antiguo vuelve a ofrecerse como actualización; los datos locales no se tocan.
- **Servidor**: la migración 005 no se deshace sola. Para volver atrás, restaurar la copia de la base de datos del paso 1 (se pierde lo sincronizado desde entonces) y desplegar la versión anterior de `server/`. Por eso el paso 2 va siempre primero y con copia: mientras no se publique el cliente nuevo, se puede volver atrás sin perder nada de las familias.
