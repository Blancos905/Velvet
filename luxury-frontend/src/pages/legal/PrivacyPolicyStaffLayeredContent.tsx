import { Link } from "react-router-dom";
import {
  companyAddress,
  companyLegalName,
  companyName,
  companyVat,
} from "../../content/legalEntity";
import { logRetentionDays } from "../../content/legalConfig";
import { GDPR_CITATIONS } from "../../content/legalReferences";
import { LEGAL_ART28_SUBPROCESSORS_PARAGRAPH, LEGAL_PUSH_NOTIFICATIONS_PARAGRAPH, LEGAL_SECURITY_MEASURES_PARAGRAPH, LEGAL_STAFF_PROCESSING_ROLES_PARAGRAPH, LEGAL_STAFF_WORKPLACE_TOOLS_PARAGRAPH, LEGAL_AUTOMATED_DECISIONS_PARAGRAPH } from "../../content/legalSharedCopy";
import { LegalCitationList } from "./LegalDocumentLayout";
import {
  LegalPrivacyAccordion,
  LegalPrivacyAudienceNotice,
  LegalPrivacyLayeredShell,
  LegalPrivacyMailLink,
} from "./LegalPrivacyAccordion";

export function PrivacyPolicyStaffLayeredContent({ embedded = false }: { embedded?: boolean }) {
  return (
    <LegalPrivacyLayeredShell>
      {!embedded ? <LegalPrivacyAudienceNotice audience="staff" /> : null}

      <LegalPrivacyAccordion title="Ruoli nel trattamento dei dati (Chi comanda)" defaultOpen>
        <p className="luxury-legal-public__text">
          <strong>Il salone presso cui lavori</strong> (datore di lavoro o titolare del negozio) è il{" "}
          <strong>Titolare del Trattamento (Data Controller)</strong>. È il salone che decide di inserirti nel gestionale Luxury,
          assegnarti turni e permessi, caricare la tua eventuale foto profilo e gestire il rapporto lavorativo o di collaborazione.
        </p>
        <p className="luxury-legal-public__text">
          <strong>{companyName}</strong> (<em>{companyLegalName}</em>, sede <em>{companyAddress}</em>
          {companyVat ? (
            <>
              , P.IVA <em>{companyVat}</em>
            </>
          ) : null}
          ) {LEGAL_STAFF_PROCESSING_ROLES_PARAGRAPH}
        </p>
        <p className="luxury-legal-public__text">
          {companyName} <strong>non utilizza</strong> i dati degli operatori per finalità proprie di marketing o profilazione
          commerciale indipendente dal servizio SaaS erogato al salone.
        </p>
        <LegalCitationList citations={[GDPR_CITATIONS.art13, GDPR_CITATIONS.art14, GDPR_CITATIONS.edpbTransparency]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Tipologia di dati e finalità del gestionale">
        <ul className="luxury-legal-public__list">
          <li>
            <strong>Dati identificativi e di accesso:</strong> Nome, cognome, email o username e credenziali di login per
            l&apos;autenticazione nell&apos;area staff (es.{" "}
            <Link to="/account/staff" className="luxury-legal-public__inline-link">
              home operatore
            </Link>
            ).
          </li>
          <li>
            <strong>Gestione dell&apos;agenda:</strong> Visualizzazione del tuo nome e del calendario lavorativo (turni, orari,
            assenze, servizi assegnati come «Taglio Uomo») per consentire ai clienti di prenotare con te e allo staff autorizzato di
            organizzare gli appuntamenti.
          </li>
          <li>
            <strong>Controllo degli accessi:</strong> Autenticazione tramite token JWT con refresh su Redis, per impedire ad
            persone non autorizzate di consultare o modificare l&apos;agenda del salone.
          </li>
          <li>
            <strong>Trasparenza e Local SEO:</strong> Pubblicazione del tuo nome e, se caricata dal titolare, della tua foto nella
            vetrina pubblica del salone (es. <code>/s/{"{slug}"}</code>) così i clienti possono scegliere l&apos;operatore preferito.
          </li>
          <li>
            <strong>Contenuti multimediali:</strong> Immagini dei lavori svolti o foto profilo gestite dal salone e mostrate nella
            vetrina, ove previsto dal piano Premium.
          </li>
          <li>
            <strong>Chat con i clienti:</strong> Messaggi scambiati tramite chat Luxury (ove attiva sul piano Premium del salone),
            con stato di lettura e notifiche collegate, per comunicazioni operative tra operatore e clientela del negozio.
          </li>
          <li>
            <strong>Notifiche operative:</strong> Avvisi in-app e push su nuove prenotazioni, aggiornamenti agenda e comunicazioni di
            servizio legate al ruolo operatore.
          </li>
          <li>
            <strong>Recensioni:</strong> Valutazioni e commenti dei clienti collegati agli appuntamenti a te assegnati, ove
            pubblicate secondo le regole della piattaforma.
          </li>
          <li>
            <strong>Log tecnici:</strong> Timestamp e indirizzo IP degli accessi per audit di sicurezza (es. individuare chi ha
            modificato o cancellato un appuntamento in agenda).
          </li>
        </ul>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation, GDPR_CITATIONS.art13]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Base giuridica del trattamento">
        <p className="luxury-legal-public__text">
          Il trattamento dei dati dello staff si fonda principalmente sull&apos;
          <strong>esecuzione del rapporto di lavoro o di collaborazione</strong> tra te e il salone titolare (Art. 6, par. 1, lett.
          b, GDPR), necessario per erogare il gestionale e organizzare l&apos;attività.
        </p>
        <p className="luxury-legal-public__text">
          Può essere invocato anche il <strong>legittimo interesse</strong> del salone (Art. 6, par. 1, lett. f, GDPR) nell&apos;
          organizzare in modo digitalizzato turni, performance e sicurezza operativa del team, nel rispetto dei tuoi diritti e
          libertà fondamentali.
        </p>
        <p className="luxury-legal-public__text">
          I trattamenti nel <strong>contesto lavorativo</strong> sono soggetti all&apos;art. 88 GDPR e alla normativa nazionale
          applicabile; in Italia il salone titolare deve rispettare anche lo Statuto dei Lavoratori e le indicazioni del Garante
          sugli strumenti digitali in ambito lavorativo.
        </p>
        <p className="luxury-legal-public__text">
          Eventuali trattamenti facoltativi (es. foto in vetrina oltre il minimo necessario) sono decisi e configurati dal titolare
          del salone, che resta responsabile della liceità verso i propri collaboratori.
        </p>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Strumenti digitali, log e sicurezza (Art. 88 GDPR)">
        <p className="luxury-legal-public__text">{LEGAL_STAFF_WORKPLACE_TOOLS_PARAGRAPH}</p>
        <p className="luxury-legal-public__text">{LEGAL_SECURITY_MEASURES_PARAGRAPH}</p>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Destinatari dei dati (Chi li vede)">
        <ol className="luxury-legal-public__list luxury-legal-public__list--ordered">
          <li>
            <strong>Titolare del salone e amministratori del team:</strong> Hanno visibilità completa su turni, permessi e report
            collegati alla tua attività operativa.
          </li>
          <li>
            <strong>Clienti finali (B2C):</strong> Vedono il tuo nome (ed eventuale foto) su web e app mobile{" "}
            <code>luxury-app</code> solo per selezionarti durante la prenotazione; non accedono ai tuoi dati di contatto privati
            oltre a quanto il salone rende necessario per l&apos;appuntamento.
          </li>
          <li>
            <strong>Fornitori Cloud:</strong> Infrastruttura protetta del monorepo Luxury (hosting, PostGIS, Redis, database
            relazionale) con accordi Art. 28 GDPR.
          </li>
        </ol>
        <p className="luxury-legal-public__text">I dati non vengono venduti a terzi.</p>
        <p className="luxury-legal-public__text">{LEGAL_ART28_SUBPROCESSORS_PARAGRAPH}</p>
        <p className="luxury-legal-public__text">{LEGAL_PUSH_NOTIFICATIONS_PARAGRAPH}</p>
        <LegalCitationList citations={[GDPR_CITATIONS.art13, GDPR_CITATIONS.art14]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Conservazione dei dati e fine rapporto">
        <p className="luxury-legal-public__text">
          I dati operativi restano nel database finché il salone mantiene attivo il tuo profilo operatore (es. da{" "}
          <Link to="/account/salone/staff" className="luxury-legal-public__inline-link">
            gestione team
          </Link>{" "}
          lato titolare).
        </p>
        <p className="luxury-legal-public__text">
          In caso di <strong>disattivazione</strong> (fine rapporto lavorativo o revoca accessi), il tuo nome viene rimosso dalle
          prenotazioni future e dalla vetrina; nello <strong>storico appuntamenti passati</strong> il salone può conservare
          riferimenti necessari a finalità contabili, di rendicontazione interna o obblighi di legge, secondo le proprie policy come
          titolare.
        </p>
        <p className="luxury-legal-public__text">
          {companyName} conserva log di sicurezza per un massimo di <em>{logRetentionDays} giorni</em> per finalità di audit e
          prevenzione abusi, poi li sovrascrive o anonimizza.
        </p>
        <LegalCitationList citations={[GDPR_CITATIONS.art13]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Trasferimenti extra SEE">
        <p className="luxury-legal-public__text">
          Se alcuni fornitori tecnici trattano dati al di fuori dello Spazio Economico Europeo, i trasferimenti avvengono solo con
          garanzie previste dal GDPR (decisioni di adeguatezza o clausole contrattuali tipo), secondo gli accordi applicabili al
          servizio.
        </p>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Obbligo di fornire i dati">
        <p className="luxury-legal-public__text">
          I dati identificativi e di accesso richiesti dal titolare per creare il profilo operatore sono necessari per
          autenticarti, visualizzare l&apos;agenda e svolgere le funzioni assegnate. Il rifiuto di fornire tali dati può impedire
          l&apos;uso del gestionale da parte del salone; eventuali obblighi contrattuali o di legge tra te e il salone restano
          disciplinati dal rapporto di lavoro o collaborazione.
        </p>
        <LegalCitationList citations={[GDPR_CITATIONS.art13]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Decisioni automatizzate">
        <p className="luxury-legal-public__text">{LEGAL_AUTOMATED_DECISIONS_PARAGRAPH}</p>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Come esercitare i tuoi diritti">
        <p className="luxury-legal-public__text">
          Per <strong>accedere, rettificare o richiedere la cancellazione</strong> dei tuoi dati di staff devi contattare{" "}
          <strong>direttamente il titolare del tuo salone</strong> (datore di lavoro o responsabile del negozio). È il salone che
          può disattivare il profilo, aggiornare turni e foto o confermare la cessazione del trattamento nei limiti del gestionale.
        </p>
        <p className="luxury-legal-public__text">
          <strong>{companyName} non può cancellare autonomamente</strong> un operatore senza istruzioni del titolare
          dell&apos;account Premium del salone, salvo obblighi di legge o segnalazioni di abuso grave.
        </p>
        <p className="luxury-legal-public__text">
          Per <strong>segnalazioni tecniche</strong>, violazioni della sicurezza informatica sulla piattaforma o contestazioni sul
          ruolo di Responsabile del Trattamento, scrivi a <LegalPrivacyMailLink />.
        </p>
        <p className="luxury-legal-public__text">
          Puoi proporre reclamo al <em>Garante per la protezione dei dati personali</em> (Italia). Se gestisci anche un account
          cliente personale, consulta l&apos;
          <Link to="/privacy/clienti" className="luxury-legal-public__inline-link">
            informativa privacy clienti (B2C)
          </Link>
          .
        </p>
        <LegalCitationList citations={[GDPR_CITATIONS.art15, GDPR_CITATIONS.art77, GDPR_CITATIONS.garante]} />
      </LegalPrivacyAccordion>
    </LegalPrivacyLayeredShell>
  );
}
