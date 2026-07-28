import { Link } from "react-router-dom";
import {
  companyAddress,
  companyLegalName,
  companyName,
  companyVat,
} from "../../content/legalEntity";
import { GDPR_CITATIONS, LEGAL_CONTACT_EMAIL } from "../../content/legalReferences";
import {
  LEGAL_ART28_SUBPROCESSORS_PARAGRAPH,
  LEGAL_PUSH_NOTIFICATIONS_PARAGRAPH,
  LEGAL_REVIEW_MODERATION_PARAGRAPH,
} from "../../content/legalSharedCopy";
import { LegalCitationList } from "./LegalDocumentLayout";
import {
  LegalPrivacyAccordion,
  LegalPrivacyAudienceNotice,
  LegalPrivacyLayeredShell,
  LegalPrivacyMailLink,
} from "./LegalPrivacyAccordion";

export function PrivacyPolicyConsumerLayeredContent({ embedded = false }: { embedded?: boolean }) {
  return (
    <LegalPrivacyLayeredShell>
      {!embedded ? <LegalPrivacyAudienceNotice audience="b2c" /> : null}

      <LegalPrivacyAccordion title="Chi tratta i dati (Titolari del Trattamento)" defaultOpen>
        <p className="luxury-legal-public__text">
          <strong>{companyName}</strong> (<em>{companyLegalName}</em>, con sede in{" "}
          <em>{companyAddress}</em>
          {companyVat ? (
            <>
              , P.IVA <em>{companyVat}</em>
            </>
          ) : null}
          ) è{" "}
          <strong>Titolare del Trattamento</strong> per i dati necessari a creare e gestire il tuo account cliente sulla
          piattaforma Luxury (sito web, area account, app mobile <code>luxury-app</code>): credenziali, profilo, preferiti,
          notifiche di piattaforma e pubblicazione delle recensioni che rilasci.
        </p>
        <p className="luxury-legal-public__text">
          <strong>Il salone che prenoti</strong> diventa <strong>Titolare autonomo del trattamento</strong> nel momento in cui
          confermi un appuntamento: lo staff del negozio deve visualizzare in agenda nome, cognome e telefono per erogare il
          servizio e gestire imprevisti. In quel flusso {companyName} agisce esclusivamente come{" "}
          <strong>Responsabile del Trattamento (Art. 28 GDPR)</strong>, fornendo il software di prenotazione secondo le istruzioni
          del salone.
        </p>
        <p className="luxury-legal-public__text">
          Contatto privacy (diritti GDPR): <LegalPrivacyMailLink /> — assistenza generale:{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="luxury-legal-public__inline-link">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
        <LegalCitationList citations={[GDPR_CITATIONS.art13, GDPR_CITATIONS.art14, GDPR_CITATIONS.edpbTransparency]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Che dati raccogliamo e perché (Finalità)">
        <ul className="luxury-legal-public__list">
          <li>
            <strong>Dati di registrazione:</strong> Nome, cognome, email e numero di telefono (necessari per evitare false
            prenotazioni e permettere al salone di avvisarti in caso di imprevisti), oltre alle credenziali criptate per l&apos;accesso
            (anche da{" "}
            <Link to="/registrati" className="luxury-legal-public__inline-link">
              registrazione cliente
            </Link>
            ).
          </li>
          <li>
            <strong>Dati di prenotazione:</strong> Servizio scelto, data, ora e salone di riferimento, conservati per erogare
            l&apos;appuntamento e mostrarti lo storico in area account.
          </li>
          <li>
            <strong>Dati di geolocalizzazione:</strong> Posizione GPS del dispositivo <strong>solo se autorizzi</strong> esplicitamente
            (browser o modulo GPS dell&apos;app Flutter) per la funzione «Saloni vicino a me» sulla{" "}
            <Link to="/search" className="luxury-legal-public__inline-link">
              pagina di ricerca
            </Link>
            . Se neghi il consenso, puoi cercare manualmente inserendo città o CAP.
          </li>
          <li>
            <strong>Recensioni:</strong> Testo e voto assegnati ai saloni, resi pubblici sulla pagina vetrina del salone (es.{" "}
            <code>/s/{"{slug}"}</code>).
          </li>
          <li>
            <strong>Dati tecnici:</strong> Indirizzo IP e log di sicurezza (sessioni JWT con refresh token) per prevenire attacchi
            brute-force sul login e garantire integrità del servizio.
          </li>
          <li>
            <strong>Notifiche push (app mobile):</strong> Token tecnico del dispositivo (FCM), piattaforma (iOS/Android) e timestamp
            di registrazione per promemoria appuntamento e comunicazioni operative, se autorizzi le notifiche dal dispositivo.
          </li>
        </ul>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation, GDPR_CITATIONS.art13]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Base giuridica del trattamento">
        <ul className="luxury-legal-public__list">
          <li>
            <strong>Esecuzione contrattuale (Art. 6, par. 1, lett. b, GDPR):</strong> Per creare il profilo, prenotare tagli e
            servizi presso i saloni e ricevere comunicazioni strettamente necessarie alla prenotazione.
          </li>
          <li>
            <strong>Consenso (Art. 6, par. 1, lett. a, GDPR):</strong> Per l&apos;accesso al GPS dello smartphone o del browser e
            per eventuali comunicazioni di marketing facoltative (ove attivate e revocabili dalle{" "}
            <Link to="/privacy/scelte" className="luxury-legal-public__inline-link">
              Scelte privacy
            </Link>
            ), nonché per le notifiche push se le attivi dall&apos;app.
          </li>
          <li>
            <strong>Legittimo interesse (Art. 6, par. 1, lett. f, GDPR):</strong> Per la sicurezza dei server, la prevenzione delle
            frodi e la rotazione dei token di sessione contro il furto di identità.
          </li>
        </ul>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Con chi condividiamo i tuoi dati (Destinatari)">
        <p className="luxury-legal-public__text">
          I dati non vengono venduti. Possono essere comunicati esclusivamente a:
        </p>
        <ol className="luxury-legal-public__list luxury-legal-public__list--ordered">
          <li>
            <strong>Il salone scelto:</strong> Riceve i dati anagrafici e il telefono necessari a confermare e gestire la
            prenotazione nel proprio gestionale/agenda Luxury.
          </li>
          <li>
            <strong>Fornitori Cloud:</strong> Infrastruttura server su cui risiedono database PostGIS (ricerca geografica saloni e
            sedi) e cache Redis (sessioni e sicurezza).
          </li>
          <li>
            <strong>OpenStreetMap Nominatim / Google Maps:</strong> Geocodifica server-side e mappe facoltative (con consenso
            cookie) per ricerca e indicazioni verso il salone.
          </li>
          <li>
            <strong>Invio email transazionali:</strong> Conferme prenotazione, promemoria e reset password.
          </li>
          <li>
            <strong>Google Firebase Cloud Messaging:</strong> Infrastruttura push per l&apos;app mobile (token dispositivo e consegna
            notifiche operative), ove l&apos;utente abiliti le notifiche.
          </li>
        </ol>
        <p className="luxury-legal-public__text">
          I fornitori tecnici agiscono come Responsabili del Trattamento vincolati da accordi Art. 28 GDPR.
        </p>
        <p className="luxury-legal-public__text">{LEGAL_ART28_SUBPROCESSORS_PARAGRAPH}</p>
        <LegalCitationList citations={[GDPR_CITATIONS.art13, GDPR_CITATIONS.art14]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Conservazione dei dati">
        <ul className="luxury-legal-public__list">
          <li>
            <strong>Account cliente:</strong> Resta attivo fino a richiesta di cancellazione da parte tua o chiusura del servizio.
          </li>
          <li>
            <strong>Inattività prolungata:</strong> In caso di account non utilizzato per un periodo prolungato (es.{" "}
            <em>24 mesi</em>), i dati personali identificativi possono essere rimossi o anonimizzati, previa comunicazione ove
            richiesto dalla normativa applicabile.
          </li>
          <li>
            <strong>Recensioni dopo eliminazione account:</strong> Le recensioni possono restare visibili sul sito per non alterare
            le medie del salone, ma vengono <strong>distaccate dalla tua identità</strong> (es. attribuite a «Utente Anonimo») quando
            invochi la cancellazione account.
          </li>
          <li>
            <strong>Log di sicurezza:</strong> Conservati per il tempo strettamente necessario all&apos;audit e alla prevenzione abusi,
            poi sovrascritti o resi anonimi.
          </li>
        </ul>
        <LegalCitationList citations={[GDPR_CITATIONS.art13]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Recensioni e moderazione contenuti">
        <p className="luxury-legal-public__text">{LEGAL_REVIEW_MODERATION_PARAGRAPH}</p>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Notifiche push">
        <p className="luxury-legal-public__text">{LEGAL_PUSH_NOTIFICATIONS_PARAGRAPH}</p>
        <LegalCitationList citations={[GDPR_CITATIONS.art13]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Diritti dell'utente e rimozione account (App Store / Google Play)">
        <p className="luxury-legal-public__text">
          Puoi esercitare i diritti di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione scrivendo a{" "}
          <LegalPrivacyMailLink />. Rispondiamo nei termini dell&apos;art. 12 GDPR.
        </p>
        <p className="luxury-legal-public__text">
          <strong>Funzione Elimina account (diritto all&apos;oblio):</strong> Da{" "}
          <Link to="/account/profilo" className="luxury-legal-public__inline-link">
            Profilo account
          </Link>
          ,{" "}
          <Link to="/privacy/elimina-account" className="luxury-legal-public__inline-link">
            Elimina account
          </Link>{" "}
          o dall&apos;app mobile (stessa area Profilo in WebView) puoi chiudere l&apos;account in autonomia. L&apos;azione invoca{" "}
          <code>DELETE /api/v1/me/account</code>: revoca sessioni, rimuove token dispositivo e anonimizza il profilo; le recensioni
          pubbliche restano senza identificazione personale come descritto sopra.
        </p>
        <p className="luxury-legal-public__text">
          Puoi proporre reclamo al <em>Garante per la protezione dei dati personali</em> (Italia).
        </p>
        <LegalCitationList
          citations={[GDPR_CITATIONS.art15, GDPR_CITATIONS.art17, GDPR_CITATIONS.art20, GDPR_CITATIONS.art77, GDPR_CITATIONS.garante]}
        />
      </LegalPrivacyAccordion>
    </LegalPrivacyLayeredShell>
  );
}
