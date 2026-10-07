# Mates Magiques API (cuentas + sincronizacion)

Backend minimo para la PWA: **una cuenta adulta por familia** (email + contrasena) con varios **perfiles infantiles** (nombre, personaje, color + progreso). Los datos son de menores: se recoge lo minimo, sin trackers ni llamadas a terceros.

## Arquitectura

```
navegador --HTTPS--> nginx 1.28 --/api/--> 127.0.0.1:3100 (Docker: mates-api, Fastify 5)
                       |                         |
                       +-- estaticos (dist/)     +-- SQLite (WAL) en /data/mates.db
```

- Mismo origen que la web estatica (`https://mates.5.189.173.136.nip.io/api/*`): **sin CORS**.
- Fastify 5 + TypeScript estricto, `better-sqlite3` (WAL, claves foraneas, solo sentencias preparadas), `@node-rs/argon2` (argon2id), `zod` en toda entrada, `pino`.
- Una sola instancia (los limitadores en memoria y SQLite lo asumen).
- Codigo: `src/routes` (HTTP), `src/repo` (SQL), `src/lib` (merge, esquemas, cripto), `src/plugins` (CSRF, auth, errores), `src/db/migrations` (SQL numerado).

## Variables de entorno

| Variable | Defecto | Descripcion |
|---|---|---|
| `NODE_ENV` | `development` | `production` activa las comprobaciones de arranque |
| `HOST` / `PORT` | `127.0.0.1` / `3100` | En Docker `HOST=0.0.0.0` (el puerto se publica solo en `127.0.0.1`) |
| `DATABASE_PATH` | `./data/mates.db` | Fichero SQLite (en Docker `/data/mates.db`) |
| `IP_HASH_SALT` | (obligatoria en produccion) | >= 32 caracteres aleatorios (`openssl rand -hex 32`) |
| `REGISTRATION_CODE` | vacia = registro cerrado | Codigo de invitacion para crear familias. En produccion >= 20 caracteres (`openssl rand -base64 24`) |
| `SESSION_COOKIE_SECURE` | `true` | Debe ser `true` en produccion. Con `false` (solo desarrollo) la cookie se llama `mm_session` |
| `TRUST_PROXY` | `127.0.0.1,::1` | IPs/CIDR cuyo `X-Forwarded-For` se acepta. En Docker: `172.30.100.1` (pasarela de la red fija de `docker-compose.yml`, que lo fija en `environment:`). Si llega una peticion de un proxy de confianza sin `X-Forwarded-For` se escribe un WARN (una vez) |
| `LOG_LEVEL` | `info` | `fatal..trace`, `silent` |
| `ARGON2_MEMORY_KIB` / `ARGON2_TIME_COST` / `ARGON2_PARALLELISM` | `19456` / `2` / `1` | Coste de argon2id |
| `SESSION_TTL_DAYS` / `SESSION_MAX_DAYS` | `30` / `90` | Caducidad deslizante / limite absoluto |
| `LOGIN_MAX_FAILURES` / `LOGIN_LOCKOUT_MINUTES` | `5` / `15` | Bloqueo temporal por IP+email (IPv6 agrupada por /64) |
| `LOGIN_EMAIL_MAX_FAILURES` | `30` | Fallos de login por email y hora desde cualquier IP; despues 429 + `Retry-After` (solo frena, nunca bloquea para siempre) |
| `RATE_LIMIT_GLOBAL` / `_AUTH` / `_LOGIN` / `_SYNC` / `_PROFILE` | `120` / `10` / `5` / `60` / `30` | Peticiones por minuto (IP; IP; IP+email; familia; familia). "IP" = IPv4 o el /64 de IPv6. La ruta de sync aplica ademas el limite global por IP |
| `QUOTA_DOCS_PER_PROFILE` / `QUOTA_ATTEMPTS_PER_PROFILE` | `2000` / `200000` | Cuotas por perfil (409 `quota_exceeded`) |
| `PURGE_AFTER_DAYS` | `30` | Borrado definitivo de perfiles borrados "suavemente" |
| `AUDIT_RETENTION_DAYS` | `90` | Retencion del registro de auditoria |

Arranque en produccion **se niega** si: falta o es corta `IP_HASH_SALT`, `REGISTRATION_CODE` tiene menos de 20 caracteres, `SESSION_COOKIE_SECURE=false`, el directorio de `DATABASE_PATH` no es escribible, o (POSIX) ese directorio es accesible por grupo/otros (`mode & 077`; fuera de produccion solo WARN; en Windows no se comprueba). El proceso arranca con `umask 077` y crea la base con modo 0600 y el directorio con 0700.

## Endpoints

Todo JSON bajo `/api`. Toda peticion que no sea GET exige `X-Requested-With: mm` y `Content-Type: application/json` (si no, 403). JSON con claves `__proto__`/`constructor.prototype` -> 400 `invalid_json`. Las rutas autenticadas validan la sesion en `onRequest` (justo despues del limitador y antes de leer el cuerpo). Los errores tienen la forma `{ "error": "codigo", "issues"?: [{path, code}] }`. Si hay demasiados hashes argon2 en cola: 503 `server_busy` + `Retry-After: 5`.

| Metodo y ruta | Auth | Descripcion |
|---|---|---|
| `GET /api/health` | no | `{ok:true, version}` |
| `POST /api/auth/register` | no | `{email, password(10..128, no comun ni trivial), inviteCode}` -> 201 + cookie |
| `POST /api/auth/login` | no | `{email, password}` -> 200 + cookie nueva |
| `POST /api/auth/logout` | no | Cierra la sesion y borra la cookie |
| `GET /api/auth/me` | si | Familia + resumen de perfiles |
| `POST /api/auth/change-password` | si | `{current, new}`; invalida las demas sesiones. 5 `current` erroneas en 15 min (contando tambien `DELETE /api/account`) cierran TODAS las sesiones de la familia (401) |
| `GET /api/profiles` | si | Perfiles de la familia |
| `PUT /api/profiles/:id` | si | `{name, character, color, createdAt}`; upsert idempotente, uuid elegido por el cliente (201 al crear, 200 al actualizar) |
| `DELETE /api/profiles/:id[?purge=true]` | si | Borrado suave (30 dias) o inmediato |
| `POST /api/profiles/:id/sync` | si | Push + pull por `seq` (ver abajo) |
| `GET /api/profiles/:id/export` | si | Todo el perfil (docs + intentos) en un JSON en streaming |
| `GET /api/account/export` | si | Familia, perfiles (tambien los borrados suavemente, con `deletedAt`), conteos y enlaces de exportacion |
| `DELETE /api/account` | si | `{password}`; borra todo al instante y cierra sesion |

Un id de perfil ajeno, inexistente, borrado o mal formado devuelve siempre **404** identico (tambien en `PUT`). Oraculo residual aceptado: como el uuid lo elige el cliente, un `PUT` con un uuid que ya existe en otra familia responde 404 en vez de 201; adivinar un uuid v4 ajeno es inviable y los upserts estan limitados por familia (`RATE_LIMIT_PROFILE`).

### Protocolo de sincronizacion

`POST /api/profiles/:id/sync` con `{ since, push: { docs: [{kind,key,data,updatedAt}] (<=500), attempts: [{id,data,createdAt}] (<=1000) } }` responde `{ seq, docs, attempts, hasMore }`. El cliente guarda `seq` como nuevo `since` y repite mientras `hasMore` sea `true` (paginas de 1000 filas). `seq` es unico y creciente en toda la base.

Correspondencia con Dexie (`mates-magiques`): `skillStates` -> `kind:'skill'`, `key=skillId`, `data`=SkillState; `factStates` -> `kind:'fact'`, `key=factKey`; `rewards` -> `kind:'rewards'`, `key:'me'`; `attempts` -> `attempts` (sin el campo `id`, que va fuera de `data`). El `profile` local (`id:'me'`) se reparte entre la tabla `profiles` del servidor (name, character, color, createdAt) y un doc `settings` (p. ej. `key:'profile'`, `{diagnosticDone}`).

### Reglas de fusion (implementadas en `src/lib/merge.ts`)

- **skill / fact**: gana el `updatedAt` mayor (last-write-wins; en empate se conserva el existente). Pero `attempts` y `correct` son monotonos: se toma el **maximo** de ambas versiones (repara deriva entre dispositivos). El `updatedAt` resultante es el maximo.
- **rewards**: campo a campo. `petals` = maximo; `stickers`, `daysPlayed`, `missionsDone` = union ordenada. Nunca se pierde un elemento.
- **settings**: last-write-wins.
- **attempts**: `INSERT ... ON CONFLICT(profile_id, id) DO NOTHING` (solo anexar). El `id` es unico **por perfil** (migracion 003): otra familia no puede silenciar ni sondear ids ajenos.
- Un push que no cambia nada no consume `seq` (los otros dispositivos no vuelven a descargarlo).
- Todo el push se aplica en **una transaccion**; un doc invalido (422) cancela todo el push.
- Formatos (los del cliente): `skillId` `/^[A-Z]\d{1,2}$/` (A1..D9, A10, C10); `factKey` `add:3+5`, `sub:12-7`, `mul:3x7`, `div:21:3`, `c10:3`; `stickers` ids `/^[a-z0-9-]{1,32}$/` (max 500); `daysPlayed` y `missionsDone` dias `AAAA-MM-DD` (max 3660 cada uno).
- Limites: `data` <= 8 KB por doc (rewards hasta 64 KB porque `daysPlayed` crece cada dia; da para ~6 anos jugando y haciendo la mision a diario). El resultado de cada **fusion se vuelve a validar** (formato, cantidades y tamano): si lo supera, 422 y se cancela todo el push. Un `(kind,key)` repetido dentro del mismo push -> 422. 1 MB por peticion, <= 500 docs y <= 1000 intentos por push.
- Cuotas: 2000 docs y 200000 intentos por perfil (409 `quota_exceeded`, se cancela todo el push); 12 perfiles activos y 24 filas en total (contando los borrados suavemente) por familia; 20 sesiones por familia (al crear la 21a se borra la mas antigua).

## Desarrollo local

```bash
cd server
npm install
cp .env.example .env     # para desarrollo: NODE_ENV=development HOST=127.0.0.1 SESSION_COOKIE_SECURE=false REGISTRATION_CODE=algo
npm run typecheck && npm test && npm run lint
npm run coverage         # umbral 85 % sobre src/
npm run dev              # tsx watch en 127.0.0.1:3100
npm run migrate          # aplica migraciones pendientes (tambien se aplican al arrancar)
```

Requiere Node 22. Las migraciones son ficheros `src/db/migrations/NNN_nombre.sql`; se aplican al arrancar, cada una en su transaccion, y quedan en `schema_migrations`. Nunca edites una migracion ya aplicada: anade una nueva.

## Crear la primera familia

1. Define `REGISTRATION_CODE` en `.env` (`openssl rand -base64 24`; en produccion >= 20 caracteres) y reinicia.
2. En la web (o con curl) registra la familia:
   ```bash
   curl -sS -X POST https://mates.5.189.173.136.nip.io/api/auth/register \
     -H 'Content-Type: application/json' -H 'X-Requested-With: mm' \
     -d '{"email":"familia@ejemplo.com","password":"una contrasena larga","inviteCode":"EL_CODIGO"}'
   ```
3. Para **cerrar el registro** una vez creadas las familias: deja `REGISTRATION_CODE=` vacio y reinicia.

Residual aceptado: quien tenga el codigo de invitacion puede saber si un email ya esta registrado (409 `email_taken`); sin el codigo la respuesta es siempre `invalid_invite`, y el registro esta limitado por IP.

### Rotar el codigo de invitacion

Cambia `REGISTRATION_CODE` en `.env` y `docker compose up -d` (recrea el contenedor). Las cuentas existentes no se ven afectadas; solo cambia lo que hace falta para crear nuevas.

### Borrar una familia

- Lo normal: la familia usa `DELETE /api/account` con su contrasena (borrado inmediato y total).
- Como administrador (sin contrasena), con claves foraneas activadas para que se propague en cascada:
  ```bash
  sqlite3 data/mates.db "PRAGMA foreign_keys=ON; DELETE FROM families WHERE email='familia@ejemplo.com';"
  ```

## Despliegue y actualizacion (Ubuntu + Docker + nginx)

```bash
# Primera vez
git clone <repo> /opt/mates && cd /opt/mates/server
sudo chmod 700 /opt/mates/server                # el directorio del servidor no es legible por otros usuarios
cp .env.example .env && chmod 600 .env          # rellenar IP_HASH_SALT (openssl rand -hex 32) y REGISTRATION_CODE (openssl rand -base64 24)
sudo install -d -m 700 -o 10001 -g 10001 data   # el contenedor corre como uid/gid 10001 (usuario 'mates' de la imagen)
docker compose up -d --build                    # red fija 172.30.100.0/24, TRUST_PROXY=172.30.100.1
curl -s http://127.0.0.1:3100/api/health

# nginx
sudo cp ops/nginx-ratelimit.conf /etc/nginx/conf.d/mates-ratelimit.conf   # contexto http {} (zona mates_auth)
sudo cp ops/snippets/mates-security.conf /etc/nginx/snippets/mates-security.conf
sudo cp ops/nginx-api.conf /etc/nginx/snippets/mates-api.conf            # e incluirlo en el bloque HTTPS:
#   include /etc/nginx/snippets/mates-api.conf;
sudo nginx -t && sudo systemctl reload nginx

# Actualizar
cd /opt/mates && git pull && cd server && docker compose up -d --build
docker compose logs --tail=50 mates-api
```

Si migras desde la version anterior (contenedor con uid 1000 y `TRUST_PROXY=172.16.0.0/12`): `docker compose down`, `sudo chown -R 10001:10001 data && sudo chmod 700 data && sudo chmod 600 data/mates.db*`, cambia `TRUST_PROXY` en `.env` a `172.30.100.1` (compose ya lo fuerza) y `docker compose up -d --build`. La imagen base se elige con `ARG NODE_IMAGE`; ver el TODO del `Dockerfile` para fijarla por digest.

El puerto 3000 de otros servicios no se toca: la API solo escucha en `127.0.0.1:3100`. Las migraciones se aplican solas al arrancar el contenedor nuevo; haz una copia antes de actualizar (`ops/backup.sh`).

## Copias de seguridad y restauracion

`ops/backup.sh` usa `sqlite3 .backup` (instantanea consistente con la API en marcha), comprueba `integrity_check`, deja ficheros `chmod 600`, y conserva 14 diarias + 8 semanales (domingos). Requiere `sqlite3` en el host (`apt install sqlite3`).

```bash
sudo cp ops/mates-backup.service ops/mates-backup-failed@.service ops/mates-backup.timer /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/mates-backup.service /etc/systemd/system/mates-backup.timer
sudo systemctl daemon-reload && sudo systemctl enable --now mates-backup.timer
# alternativa cron: 17 3 * * * /opt/mates/server/ops/backup.sh
```

**Comprobar que funciona** (tras instalar y de vez en cuando):

```bash
systemctl list-timers mates-backup.timer              # proxima ejecucion y la ultima
sudo systemctl start mates-backup.service             # ejecucion manual inmediata
journalctl -u mates-backup -n 20                      # debe acabar en "backup ok: ..."
journalctl -p crit -t mates-backup                    # alertas de fallo (OnFailure -> mates-backup-failed@)
sudo ls -l /var/backups/mates/daily/
```

El servicio crea `/var/backups/mates` (0700) en `ExecStartPre` antes de aplicar el sandbox, asi que la primera ejecucion ya no falla con `226/NAMESPACE`.

**Prueba de restauracion** (sin tocar produccion, una vez al mes):

```bash
tmp=$(mktemp -d) && sudo cp "$(sudo ls -1t /var/backups/mates/daily/mates-*.db | head -1)" "$tmp/t.db"
sudo sqlite3 "$tmp/t.db" 'PRAGMA integrity_check; SELECT COUNT(*) FROM families; SELECT COUNT(*) FROM attempts;'
sudo rm -rf "$tmp"
```

**Restaurar**

```bash
cd /opt/mates/server
docker compose stop mates-api
mv data/mates.db data/mates.db.broken; rm -f data/mates.db-wal data/mates.db-shm
cp /var/backups/mates/daily/mates-AAAA-MM-DD.db data/mates.db
sudo chown 10001:10001 data/mates.db && sudo chmod 600 data/mates.db
sqlite3 data/mates.db 'PRAGMA integrity_check;'   # debe imprimir ok
docker compose start mates-api
```

Cuidado: restaurar deshace los borrados posteriores a la copia (RGPD). Anota los borrados pedidos desde la fecha de la copia y repitelos tras restaurar. Las copias contienen datos personales: guardalas solo en el servidor (o cifradas) y respeta la misma retencion.

## Modelo de amenazas (resumen)

| Que se guarda | Que NO se guarda |
|---|---|
| Email de la familia, hash argon2id de la contrasena | Apellidos, fechas de nacimiento, direcciones, telefonos |
| Perfil: nombre de pila (1-20), personaje, color | Fotos, voz, ubicacion, identificadores de dispositivo |
| Progreso: habilidades, hechos, recompensas, ajustes, intentos | Contenido libre escrito por el nino |
| Sesiones: solo SHA-256 del token (nunca el token) | IP en claro, user agent (ni siquiera su hash), cuerpos de peticion, contrasenas en logs |
| Auditoria: evento + fecha + hash salado de la IP (IPv4 o /64 de IPv6) (90 dias). Al borrar la cuenta sus filas quedan sin `family_id` | Cookies de terceros, analitica, llamadas a servicios externos |

Medidas: argon2id (maximo 2 simultaneos, cola de 20, despues 503); contrasenas comunes/triviales rechazadas; cookie `__Host-` `HttpOnly; Secure; SameSite=Strict`; CSRF con cabecera `X-Requested-With: mm` + `application/json`; helmet y `Cache-Control: no-store`; limites por IP (IPv6 agrupada por /64), por IP+email y por email (login), por familia (sync, perfiles, reautenticacion) y bloqueo temporal; limite de nginx en `/api/auth/` (10 r/min, rafaga 5); cuotas por perfil y familia; `secure_delete` y `wal_checkpoint(TRUNCATE)` tras borrados; base de datos 0600 en directorio 0700 con usuario dedicado (uid 10001); aislamiento por familia con 404 uniforme; SQL solo parametrizado; validacion zod de toda entrada (los errores nunca repiten el contenido recibido); logs solo con metodo, ruta (plantilla), estado, latencia e id de peticion; 500 genericos; tokens y secretos comparados en tiempo constante.

Limites conocidos: un atacante con acceso al servidor o a las copias ve el progreso (sin cifrado en reposo a nivel de aplicacion; usa disco cifrado); el registro depende del secreto de invitacion; los limitadores en memoria se reinician con el proceso (el bloqueo de login si persiste).

## Lista RGPD

- [x] **Minimizacion**: solo email adulto + nombre de pila/personaje/color + progreso. Sin tracking ni terceros.
- [x] **Base legal / informacion**: informa a las familias (consentimiento del adulto responsable) de que datos se guardan y para que. El texto de privacidad vive en la web (fuera de este servicio).
- [x] **Acceso y portabilidad**: `GET /api/account/export` y `GET /api/profiles/:id/export` (JSON).
- [x] **Rectificacion**: `PUT /api/profiles/:id`, y el cliente puede reescribir el progreso.
- [x] **Supresion**: `DELETE /api/profiles/:id?purge=true` y `DELETE /api/account` (inmediatos, en cascada, incluso con miles de intentos). Con `secure_delete=ON` SQLite sobrescribe con ceros el contenido borrado y tras cada borrado definitivo se hace `wal_checkpoint(TRUNCATE)`, asi que los datos no quedan en el fichero `-wal`. Siguen existiendo en las **copias de seguridad** hasta que estas rotan (maximo ~2 meses). Al borrar la cuenta, las filas de auditoria de la familia quedan desvinculadas (`family_id = NULL`). Borrado suave de perfil: purga definitiva a los 30 dias (mientras tanto aparece en la exportacion de la cuenta con `deletedAt`).
- [x] **Limitacion de conservacion**: auditoria 90 dias, sesiones caducadas y bloqueos purgados cada hora; copias: 14 diarias + 8 semanales (maximo ~2 meses).
- [x] **Seguridad**: ver modelo de amenazas. Rotar `IP_HASH_SALT` invalida la correlacion de hashes antiguos (aceptable).
- [ ] **Pendiente del responsable**: registro de actividades de tratamiento, texto de privacidad y contacto para ejercer derechos; revisar la politica de copias si recibes una peticion de supresion.
