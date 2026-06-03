import { Link } from "react-router-dom";
import {
  LEGAL_ENTITY_ADDRESS_TODO,
  LEGAL_ENTITY_LEGAL_NAME_TODO,
  LEGAL_ENTITY_VAT_TODO,
  legalEntityName,
} from "../../content/legalEntity";
import { GDPR_CITATIONS } from "../../content/legalReferences";
import { LegalCitationList } from "./LegalDocumentLayout";
import {
  LegalPrivacyAccordion,
  LegalPrivacyAudienceNotice,
  LegalPrivacyLayeredShell,
  LegalPrivacyMailLink,
} from "./LegalPrivacyAccordion";

export function PrivacyPolicyLayeredContent() {
  return (
    <LegalPrivacyLayeredShell>
      <LegalPrivacyAudienceNotice audience="b2b" />
      <LegalPrivacyAccordion title="Chi tratta i dati" defaultOpen>
        <p className="velvet-legal-public__text">
          <strong>Titolare del Trattamento:</strong> Il trattamento dei dati personali è effettuato da{" "}
          <em>{LEGAL_ENTITY_LEGAL_NAME_TODO}</em>, con sede legale in <em>{LEGAL_ENTITY_ADDRESS_TODO}</em>, P.IVA{" "}
          <em>{LEGAL_ENTITY_VAT_TODO}</em> (di seguito denominata <strong>«{legalEntityName}»</strong>).
        </p>
        <p className="velvet-legal-public__text">
          <strong>Contatto Privacy Ufficiale:</strong> <LegalPrivacyMailLink /> (dedicato all&apos;esercizio dei diritti GDPR).
        </p>
        <hr className="velvet-legal-public__divider" />
        <p className="velvet-legal-public__text">
          <strong>Ruoli Salone e Piattaforma (Art. 28 GDPR):</strong>
        </p>
        <ul className="velvet-legal-public__list">
          <li>
            <strong>B2B (Staff/Titolari):</strong> {legalEntityName} tratta i dati necessari a registrare e gestire il tuo
            account titolare, l&apos;abbonamento Premium, e la piattaforma tecnica (autenticazione tramite token, sicurezza,
            assistenza, notifiche di servizio e funzioni come vetrina personalizzata, statistiche e report).
          </li>
          <li>
            <strong>B2C (Clienti finali dei saloni):</strong> Per i dati dei clienti trattati in agenda, anagrafica,
            prenotazioni e comunicazioni operative, il salone partner agisce come <strong>Titolare del Trattamento</strong>{" "}
            verso la propria clientela. {legalEntityName} tratta tali dati esclusivamente come{" "}
            <strong>Responsabile del Trattamento (Data Processor)</strong>, secondo contratto e istruzioni necessarie
            all&apos;erogazione del servizio.
          </li>
        </ul>
        <LegalCitationList citations={[GDPR_CITATIONS.art13, GDPR_CITATIONS.edpbTransparency]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Dati trattati e finalità">
        <p className="velvet-legal-public__text">
          I dati sono trattati unicamente per le finalità collegate al servizio Luxury attivo sul salone:
        </p>
        <ul className="velvet-legal-public__list">
          <li>
            <strong>Account titolare:</strong> Email, nome, telefono e credenziali criptate per accesso, sicurezza e
            assistenza.
          </li>
          <li>
            <strong>Salone e vetrina Premium:</strong> Nome, slug URL (es. <code>/saloni/slug</code>), indirizzo, contenuti
            pubblici, immagini e layout per ricerca pubblica e ottimizzazione Local SEO.
          </li>
          <li>
            <strong>Posizione e geolocalizzazione:</strong> Indirizzo della sede e coordinate geografiche salvate su database
            geospaziale (PostGIS) per abilitare la ricerca «vicino a me» lato consumatore.
          </li>
          <li>
            <strong>Clienti del salone:</strong> Anagrafica, contatti, appuntamenti storici e futuri, recensioni rilasciate.
          </li>
          <li>
            <strong>Staff e operatori:</strong> Dati di accesso e foto in agenda per l&apos;organizzazione interna del team del
            salone.
          </li>
          <li>
            <strong>Dati tecnici e di sicurezza:</strong> Log di accesso, identificativi di sessione (gestiti tramite JWT con
            refresh token rotation su cache Redis blindata) necessari a garantire la prevenzione degli abusi.
          </li>
        </ul>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation, GDPR_CITATIONS.art13]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Geolocalizzazione e posizione del salone">
        <p className="velvet-legal-public__text">
          Per l&apos;erogazione del servizio trattiamo i dati di posizione geografica del salone inseriti nel Profilo
          (indirizzo, città, CAP). Tramite processi di geocodifica (Google Maps API), ricaviamo le coordinate geografiche
          necessarie per mostrare la struttura sulle mappe e consentire l&apos;indicizzazione dei dati strutturati (JSON-LD) da
          parte dei motori di ricerca.
        </p>
        <p className="velvet-legal-public__text">
          Per la gestione ordinaria del salone <strong>non è richiesta la posizione GPS in tempo reale del tuo dispositivo</strong>
          . Se l&apos;utente finale utilizza l&apos;area cliente (B2C), l&apos;eventuale tracciamento GPS del dispositivo per
          suggerire i saloni limitrofi è totalmente facoltativo e subordinato al consenso esplicito richiesto dal browser o dal
          sistema operativo.
        </p>
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Basi giuridiche (Art. 6 GDPR)">
        <p className="velvet-legal-public__text">Il trattamento si fonda sulle seguenti basi giuridiche:</p>
        <ul className="velvet-legal-public__list">
          <li>
            <strong>Esecuzione contrattuale (Art. 6, par. 1, lett. b, GDPR):</strong> Per la gestione dell&apos;account,
            l&apos;erogazione delle funzioni SaaS, la pubblicazione della vetrina e la ricerca geolocalizzata.
          </li>
          <li>
            <strong>Legittimo interesse (Art. 6, par. 1, lett. f, GDPR):</strong> Per il monitoraggio della sicurezza
            informatica, la prevenzione delle frodi (es. rotazione dei token di sessione su Redis) e la stabilità
            dell&apos;infrastruttura cloud hosting.
          </li>
          <li>
            <strong>Consenso dell&apos;interessato (Art. 6, par. 1, lett. a, GDPR):</strong> Per eventuali attività
            facoltative lato client, come l&apos;uso del GPS del browser o l&apos;attivazione di cookie di terze parti (ove
            presenti).
          </li>
        </ul>
        <LegalCitationList citations={[GDPR_CITATIONS.regulation]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Destinatari e terze parti">
        <p className="velvet-legal-public__text">
          I dati non vengono venduti o ceduti a terzi. Possono essere comunicati o risultare accessibili esclusivamente a:
        </p>
        <ol className="velvet-legal-public__list velvet-legal-public__list--ordered">
          <li>
            <strong>Fornitori di infrastruttura Cloud, Server e Hosting:</strong> Su cui risiede fisicamente l&apos;architettura
            Luxury, il database PostGIS e la cache Redis.
          </li>
          <li>
            <strong>Fornitori di servizi di geocodifica e mappe (Google Maps API):</strong> A cui viene inviato l&apos;indirizzo
            del salone esclusivamente per calcolare le coordinate geografiche e mostrare le mappe interattive.
          </li>
          <li>
            <strong>Fornitori di servizi IT di invio email transazionali:</strong> Per l&apos;invio automatizzato di notifiche
            di prenotazione, scadenze o reset password.
          </li>
        </ol>
        <p className="velvet-legal-public__text">
          Tutti i fornitori tecnici esterni agiscono in veste di Responsabili del Trattamento vincolati da accordi di
          riservatezza (Art. 28 GDPR).
        </p>
        <LegalCitationList citations={[GDPR_CITATIONS.art13, GDPR_CITATIONS.art14]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Conservazione dei dati">
        <p className="velvet-legal-public__text">
          I tempi di conservazione sono rigidamente limitati alle finalità operative e agli obblighi normativi:
        </p>
        <ul className="velvet-legal-public__list">
          <li>
            <strong>Dati dell&apos;Account e Abbonamento B2B:</strong> Conservati per tutta la durata del rapporto contrattuale
            e, in seguito alla cessazione, per un periodo di 10 anni in conformità agli obblighi civili e fiscali italiani.
          </li>
          <li>
            <strong>Dati dei Clienti del Salone (Agenda):</strong> Conservati all&apos;interno del database PostGIS fino a quando
            il Salone mantiene attivo il proprio account aziendale o ne richiede esplicitamente la rimozione.
          </li>
          <li>
            <strong>Log di sicurezza e sessione (Redis/Postgres):</strong> Conservati per un periodo massimo di{" "}
            <em>[es. 30/90 giorni]</em> per finalità di audit di sicurezza e tracciamento abusi, dopodiché sovrascritti o resi
            anonimi.
          </li>
        </ul>
        <LegalCitationList citations={[GDPR_CITATIONS.art13]} />
      </LegalPrivacyAccordion>

      <LegalPrivacyAccordion title="Diritti degli interessati (Artt. 15–22 GDPR)">
        <p className="velvet-legal-public__text">
          Gli utenti possono esercitare in qualsiasi momento i diritti previsti dal GDPR (Accesso, Rettifica,
          Cancellazione/Oblio, Limitazione, Portabilità e Opposizione) inviando una comunicazione a: <LegalPrivacyMailLink />.
        </p>
        <p className="velvet-legal-public__text">
          <strong>Cancellazione Account via Mobile App (Luxury App / Flutter Shell):</strong> In conformità con le policy di
          trasparenza degli store Apple e Google, se utilizzi l&apos;applicazione mobile puoi richiedere la rimozione immediata,
          self-service e definitiva del tuo account e dei relativi dati personali accedendo alla sezione{" "}
          <code>Account &gt; Elimina Account</code> (che richiama l&apos;endpoint sicuro di backend{" "}
          <code>DELETE /api/v1/me/account</code>).
        </p>
        <p className="velvet-legal-public__text">
          Sul web puoi usare anche la pagina{" "}
          <Link to="/privacy/elimina-account" className="velvet-legal-public__inline-link">
            Elimina account
          </Link>{" "}
          o le{" "}
          <Link to="/privacy/scelte" className="velvet-legal-public__inline-link">
            Scelte privacy
          </Link>
          .
        </p>
        <p className="velvet-legal-public__text">
          Gli interessati hanno inoltre il diritto di proporre reclamo all&apos;Autorità di Controllo competente (in Italia:{" "}
          <em>Garante per la protezione dei dati personali</em>).
        </p>
        <LegalCitationList
          citations={[GDPR_CITATIONS.art15, GDPR_CITATIONS.art17, GDPR_CITATIONS.art20, GDPR_CITATIONS.art77, GDPR_CITATIONS.garante]}
        />
      </LegalPrivacyAccordion>
    </LegalPrivacyLayeredShell>
  );
}
