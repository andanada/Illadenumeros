/*
 * Built-in list of very common passwords (M3). Compiled from public "most used passwords" rankings
 * (English, Spanish and Catalan) and the variants people build from them. No network access at runtime.
 * Only entries of >= 10 characters matter (shorter ones are already refused by the length rule), so the
 * list combines frequent base words with the suffixes most often appended to reach a length requirement.
 */

const EXPLICIT: readonly string[] = [
  '1234567890', '0987654321', '1q2w3e4r5t', '1q2w3e4r5t6y', 'q1w2e3r4t5', 'qwertyuiop', 'asdfghjkl;', 'zxcvbnm123',
  'qwerty1234', 'qwerty12345', 'qwerty123456', 'qwertyuiop123', '1qaz2wsx3edc', 'qazwsxedcrfv', 'zaq12wsxcde3',
  'asdfghjkl1', 'asdfasdfasdf', 'abcdefghij', 'abcdefghijk', 'abcd123456', 'abc1234567', 'abcdef123456',
  'aa12345678', 'a1b2c3d4e5', 'iloveyou12', 'iloveyou123', 'iloveyou1234', 'passw0rd123', 'p@ssw0rd123',
  'p@ssword123', 'password!1', 'password1!', 'password12', 'password123', 'password1234', 'password12345',
  'passwordpassword', 'letmein123', 'letmein1234', 'welcome123', 'welcome1234', 'welcome2024', 'changeme123',
  'trustno1234', 'football123', 'baseball123', 'basketball', 'basketball1', 'starwars123', 'superman123',
  'batman12345', 'pokemon1234', 'princess123', 'sunshine123', 'whatever123', 'computer123', 'internet123',
  'administrator', 'admin12345', 'admin123456', 'administrador', 'contrasena', 'contrasena1', 'contrasena123',
  'contraseña', 'contraseña1', 'contraseña123', 'contrasenya', 'contrasenya1', 'contrasenya123', 'barcelona1',
  'barcelona10', 'barcelona123', 'realmadrid', 'realmadrid1', 'realmadrid123', 'valencia123', 'sevilla123',
  'catalunya1', 'catalunya123', 'teestimo123', 'tequiero123', 'mariposa123', 'estrella123', 'princesa123',
  'qwerty123qwerty', '123qweasdzxc', 'qweasdzxc123', '1234qwerasdf', '1234abcd1234', '12345qwert',
  '12345abcde', '11111111111', '123123123123', '1231231231', '1212121212', '1122334455', '0000000000',
  '9999999999', '5555555555', '1234512345', '1234554321', '0123456789', '987654321a', 'a123456789',
  '123456789a', '123456789q', 'q123456789', 'qwerty123!', 'passw0rd!1', 'p@ssw0rd!1', 'welcome1!2',
  'correcthorsebatterystaple', 'correct horse battery staple', 'mypassword', 'mypassword1', 'mypassword123',
  'secretpassword', 'supersecret', 'supersecret1', 'thisismypassword', 'iloveyouforever', 'loveyou123',
  'michael123', 'jennifer123', 'jordan2323', 'charlie123', 'jessica123', 'ashley1234', 'daniel1234',
  'monkey12345', 'dragon12345', 'shadow12345', 'master12345', 'killer12345', 'hunter12345', 'freedom123',
  'chocolate1', 'chocolate123', 'butterfly1', 'butterfly123', 'liverpool1', 'liverpool123',
  'chelsea123', 'arsenal123', 'manchester', 'manchester1', 'playstation', 'playstation2', 'playstation3',
  'playstation4', 'minecraft1', 'minecraft123', 'fortnite123', 'spiderman1', 'spiderman123', 'qwerasdfzxcv',
  'zxcvbnmasdf', 'asdfqwerzxcv', 'mates magiques', 'matesmagiques', 'matesmagiques1', 'matesmagiques123',
]

/** Frequent base words; combined with SUFFIXES below. */
const BASES: readonly string[] = [
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'qwerty', 'qwertyui', 'abc123', 'abcdef', 'iloveyou', 'letmein',
  'welcome', 'monkey', 'dragon', 'football', 'baseball', 'master', 'shadow', 'sunshine', 'princess', 'superman',
  'batman', 'trustno1', 'starwars', 'whatever', 'freedom', 'computer', 'internet', 'michael', 'jennifer', 'jordan',
  'charlie', 'jessica', 'ashley', 'daniel', 'thomas', 'hunter', 'killer', 'soccer', 'hockey', 'ranger', 'tigger',
  'pokemon', 'naruto', 'cookie', 'flower', 'summer', 'winter', 'spring', 'autumn', 'orange', 'banana', 'chicken',
  'pepper', 'ginger', 'cheese', 'purple', 'silver', 'golden', 'diamond', 'secret', 'access', 'change', 'changeme',
  'admin', 'administrator', 'login', 'guest', 'family', 'friends', 'forever', 'lovely', 'loveme', 'angel', 'angels',
  'contrasena', 'contrasenya', 'clave', 'hola', 'holahola', 'teamo', 'tequiero', 'teestimo', 'mariposa', 'estrella',
  'princesa', 'barcelona', 'madrid', 'realmadrid', 'valencia', 'sevilla', 'catalunya', 'espana', 'futbol', 'messi',
  'cristiano', 'familia', 'casa', 'gato', 'perro', 'amor', 'amorcito', 'corazon', 'mates', 'escola', 'escuela',
  'matematicas', 'matematiques', 'nino', 'nina', 'bebe', 'mama', 'papa', 'mamapapa', 'abuela', 'abuelo',
]

const SUFFIXES: readonly string[] = ['', '1', '12', '123', '1234', '12345', '123456', '!', '1!', '123!', '01', '2023', '2024', '2025', '2026']

const generated = BASES.flatMap((base) => SUFFIXES.map((suffix) => `${base}${suffix}`))

export const COMMON_PASSWORD_LIST: readonly string[] = [...new Set([...EXPLICIT, ...generated])]
