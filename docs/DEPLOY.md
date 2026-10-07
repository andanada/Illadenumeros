# Despliegue de Mates Màgiques

La app es 100 % estática: `npm run build` genera `dist/` y basta con servirlo con nginx detrás de HTTPS. No hay servidor, variables de entorno ni peticiones externas.

## 1. Generar el build

```bash
npm ci
npm run build        # tsc -b + vite build (incluye el service worker)
```

`dist/` contiene `index.html`, `assets/` (con hash en el nombre), `icons/`, `icon.svg`, `manifest.webmanifest`, `sw.js` y `workbox-*.js`.

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

`no-cache` no significa "no guardar": el navegador revalida con ETag y recibe un 304 barato.

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

`npm run e2e` (los 50 tests contra el servidor de desarrollo) no cambia.
