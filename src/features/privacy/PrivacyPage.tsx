import { Screen } from '../../ui/Screen'
import { isPlaceholderContact, PRIVACY_CONTACT_EMAIL } from './contact'
import { Children, NotDone, Retention, Rights, Security, StoredData } from './PrivacyBlocks'
import { PrivacySection } from './PrivacySection'

export interface PrivacyPageProps {
  /** Injected in tests; by default the single constant in `contact.ts`. */
  contactEmail?: string
}

export default function PrivacyPage({ contactEmail = PRIVACY_CONTACT_EMAIL }: PrivacyPageProps) {
  return (
    <Screen title="Privacitat" back="/">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-10">
        <p className="text-xl leading-snug text-ink">
          Aquesta pàgina és per a les famílies. Hi expliquem, amb paraules senzilles, què fa Mates Màgiques amb les dades i com podeu controlar-les (Reglament General de Protecció de Dades, RGPD).
        </p>
        <StoredData />
        <NotDone />
        <Retention />
        <Rights />
        <Children />
        <Security />
        <PrivacySection title="Com contactar-nos">
          <p>Per a qualsevol dubte, per exercir els vostres drets o per demanar-nos que esborrem dades, escriviu a:</p>
          <p>
            <a href={`mailto:${contactEmail}`} className="break-all text-xl font-semibold text-brand-dark underline underline-offset-4">
              {contactEmail}
            </a>
          </p>
          {isPlaceholderContact(contactEmail) && (
            <p role="note" className="rounded-2xl bg-sol/50 px-4 py-3 text-base font-semibold text-ink">
              Avís per a qui publica l’app: l’adreça de contacte encara no està configurada. Cal substituir-la a <code>src/features/privacy/contact.ts</code> abans de compartir l’app amb altres
              famílies.
            </p>
          )}
          <p className="text-base text-ink/70">Si creieu que no hem tractat bé les vostres dades, també podeu reclamar davant l’Autoritat Catalana de Protecció de Dades (apdcat.gencat.cat).</p>
        </PrivacySection>
      </div>
    </Screen>
  )
}
