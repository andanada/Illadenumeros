import { BulletList, PrivacySection } from './PrivacySection'

export function StoredData() {
  return (
    <PrivacySection title="Quines dades es guarden">
      <p>
        <strong>Sense compte (el cas habitual).</strong> Només això, i només dins del navegador d’aquest dispositiu:
      </p>
      <BulletList
        items={[
          'el nom de pila que escriu l’infant (no demanem cognoms),',
          'el personatge i el color que tria,',
          'el seu progrés: habilitats, respostes, pètals i pegatines.',
        ]}
      />
      <p>
        <strong>Amb un compte de família</strong> (opcional, per compartir el progrés entre dispositius), a més:
      </p>
      <BulletList
        items={[
          'el vostre correu electrònic,',
          'la contrasenya, que no es desa mai tal com l’escriviu sinó transformada amb Argon2id, un algorisme pensat perquè no es pugui recuperar,',
          'una còpia del progrés dels jugadors, al nostre propi servidor, situat a la Unió Europea (Espanya),',
          'una galeta de sessió, necessària per mantenir-vos dins del compte. No és una galeta de seguiment.',
        ]}
      />
    </PrivacySection>
  )
}

export function NotDone() {
  return (
    <PrivacySection title="Què no fem">
      <BulletList
        items={[
          'No hi ha analítiques ni cap eina de mesura d’ús.',
          'No hi ha publicitat ni perfils per a anuncis.',
          'No hi ha tercers: no compartim ni venem dades i no incorporem serveis d’altres empreses.',
          'No fem peticions externes: la tipografia, les imatges i els sons van dins de l’app, i l’única adreça amb què es comunica és el nostre propi servidor (i només si feu servir un compte).',
          'No demanem ubicació, càmera, micròfon ni contactes.',
        ]}
      />
    </PrivacySection>
  )
}

export function Retention() {
  return (
    <PrivacySection title="Quant de temps es guarden">
      <BulletList
        items={[
          'Les dades del dispositiu es queden fins que les esborreu vosaltres o es netegin les dades del navegador.',
          'Si esborreu un jugador del compte, el seu progrés es conserva 30 dies al servidor per si ha estat un error, i després s’elimina definitivament.',
          'Si esborreu el compte de la família, tot el que hi havia al servidor s’elimina en el moment.',
          'Les còpies de seguretat del servidor es renoven soles: el que s’esborra deixa de ser-hi com a molt uns dos mesos després.',
          'La sessió caduca sola després de 30 dies sense ús (i com a màxim als 90 dies). Els registres de seguretat, que només contenen una empremta no reversible de l’adreça de xarxa, s’eliminen als 90 dies.',
        ]}
      />
    </PrivacySection>
  )
}

export function Rights() {
  return (
    <PrivacySection title="Exportar i esborrar les dades">
      <p>
        <strong>Descarregar-les.</strong> Amb un compte, la secció de compte té l’enllaç «Descarrega les dades del compte (JSON)», que baixa tot el que tenim de la família. Equival a obrir{' '}
        <code className="rounded bg-brand-soft px-1">/api/account/export</code> havent entrat al compte. Sense compte, a «Per a la família» podeu desar una còpia del progrés en un fitxer.
      </p>
      <p>
        <strong>Esborrar-les.</strong>
      </p>
      <BulletList
        items={[
          'Compte i dades del servidor: «Esborra el compte» (demana la contrasenya i una confirmació doble).',
          'Progrés d’aquest dispositiu: a «Per a la família» (àrea només per a adults), «Esborra tot el progrés» d’un jugador, o esborrar les dades del lloc des del navegador per eliminar-ho tot.',
        ]}
      />
      <p>També teniu dret a rectificar-les i a limitar-ne el tractament; escriviu-nos i ho gestionem.</p>
    </PrivacySection>
  )
}

export function Children() {
  return (
    <PrivacySection title="Les dades dels infants">
      <p>
        L’app és per a infants, però qui en gestiona les dades és el pare, la mare o tutor: crea el compte, decideix si es fa servir i pot exportar o esborrar-ho tot en qualsevol moment. L’infant no
        ha de donar cap correu ni dada de contacte; només el seu nom de pila. Us recomanem que no hi escrigui el cognom.
      </p>
      <p>No es mostren puntuacions ni comparacions amb altres infants, i el progrés només el veu la família.</p>
    </PrivacySection>
  )
}

export function Security() {
  return (
    <PrivacySection title="Com es protegeixen">
      <BulletList
        items={[
          'Tota la comunicació amb el servidor va xifrada amb HTTPS.',
          'Les contrasenyes es desen amb Argon2id i mai en text clar.',
          'La galeta de sessió només és accessible pel servidor (HttpOnly), només viatja per HTTPS i no s’envia a altres llocs.',
          'Hi ha límits d’intents contra els accessos per força bruta i el servidor valida tot el que rep.',
          'El servidor és nostre i està a la Unió Europea; no s’usa cap servei de tercers per guardar dades.',
        ]}
      />
    </PrivacySection>
  )
}
