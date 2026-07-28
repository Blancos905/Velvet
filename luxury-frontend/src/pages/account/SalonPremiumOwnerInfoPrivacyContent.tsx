import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  LEGAL_AUTOMATED_DECISIONS_PARAGRAPH,
  LEGAL_PLATFORM_ADMIN_ACCESS_PARAGRAPH,
  LEGAL_PREMIUM_BILLING_DATA_PRIVACY_PARAGRAPH,
  LEGAL_PROCESSING_ROLES_PARAGRAPH,
  LEGAL_RIGHTS_RESPONSE_PARAGRAPH,
  LEGAL_STRIPE_PAYMENT_PROCESSOR_PARAGRAPH,
} from "../../content/legalSharedCopy";
import { isLuxuryNativeAppShell } from "../../hooks/useLuxuryNativeAppShell";
import "../../styles/luxury-info-privacy-premium.css";

type SalonPremiumOwnerInfoPrivacyContentProps = {
  supportEmail?: string | null;
  salonName?: string | null;
  showAccountActions?: boolean;
};

type PrivacyPanelId =
  | "controller"
  | "data"
  | "geolocation"
  | "legal-basis"
  | "recipients"
  | "transfers"
  | "retention"
  | "rights"
  | "mandatory"
  | "automated"
  | "updates";

type PrivacyPanel = {
  id: PrivacyPanelId;
  title: string;
  kicker: string;
  content: ReactNode;
};

type DataTile = {
  id: string;
  title: string;
  text: string;
};

const DATA_TILES: DataTile[] = [
  {
    id: "account",
    title: "Account titolare",
    text: "Email, nome, telefono e credenziali per accesso, sicurezza, assistenza e comunicazioni di servizio.",
  },
  {
    id: "showcase",
    title: "Salone e vetrina Premium",
    text: "Nome, slug, indirizzo, contenuti pubblici, brand, immagini e layout per ricerca, pagina /s/… e mappa.",
  },
  {
    id: "location",
    title: "Posizione e geolocalizzazione",
    text: "Indirizzo della sede e coordinate per ricerca geografica, mappa pubblica e confronto distanza con i clienti.",
  },
  {
    id: "clients",
    title: "Clienti del salone",
    text: "Anagrafica, contatti, legame con account cliente Luxury, prenotazioni, notifiche e chat collegate.",
  },
  {
    id: "staff",
    title: "Staff e operatori",
    text: "Dati di accesso e foto in agenda per organizzazione del team e visualizzazione operativa.",
  },
  {
    id: "insights",
    title: "Recensioni e statistiche",
    text: "Misurazione dell’attività, report informativi e documentazione collegata al piano Premium.",
  },
  {
    id: "billing",
    title: "Fatturazione Premium",
    text: "Dati fiscali e di fatturazione (P.IVA/CF, SDI/PEC, indirizzo) in registrazione Premium e prima del checkout Stripe.",
  },
  {
    id: "technical",
    title: "Dati tecnici",
    text: "Log, identificativi di sessione e metadati necessari a sicurezza, prevenzione abusi e continuità.",
  },
];

function supportMailto(email: string | null | undefined): string | null {
  const value = email?.trim();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return `mailto:${encodeURIComponent(value)}`;
}

function ChevronIcon() {
  return (
    <svg className="luxury-info-privacy-premium__chevron" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 9l6 6 6-6"
      />
    </svg>
  );
}

function PanelIcon({ kind }: { kind: PrivacyPanelId }) {
  const paths: Record<PrivacyPanelId, ReactNode> = {
    controller: (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M12 3l7 4v5c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V7l7-4z"
      />
    ),
    data: (
      <>
        <rect x="4.5" y="5" width="15" height="14" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    geolocation: (
      <>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z"
        />
        <circle cx="12" cy="11" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
    "legal-basis": (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M7 5h10v14H7zM9 9h6M9 13h4"
      />
    ),
    recipients: (
      <>
        <circle cx="8.5" cy="9" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="15.5" cy="9" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.5 17c.8-2 2.4-3 3-3s2.2 1 3 3M12.5 17c.8-2 2.4-3 3-3s2.2 1 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    transfers: (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12h16M14 7l5 5-5 5M10 7L5 12l5 5"
      />
    ),
    retention: (
      <>
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    rights: (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v4M8 7h8M7 11h10v8H7z"
      />
    ),
    mandatory: (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M12 4l7 3v5c0 3.8-2.6 6.8-7 8-4.4-1.2-7-4.2-7-8V7l7-3z"
      />
    ),
    automated: (
      <>
        <rect x="5" y="6" width="14" height="12" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 11h6M9 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    updates: (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 7h14v10H5zM8 11h8M8 14h5"
      />
    ),
  };

  return (
    <span className="luxury-info-privacy-premium__panel-icon" aria-hidden>
      <svg viewBox="0 0 24 24" width={20} height={20}>
        {paths[kind]}
      </svg>
    </span>
  );
}

export function SalonPremiumOwnerInfoPrivacyContent({
  supportEmail,
  salonName,
  showAccountActions = true,
}: SalonPremiumOwnerInfoPrivacyContentProps) {
  const baseId = useId();
  const panelRefs = useRef<Partial<Record<PrivacyPanelId, HTMLElement | null>>>({});
  const contactEmail = supportEmail?.trim() || "assistenza@saloniluxury.it";
  const mailHref = supportMailto(contactEmail);
  const namedSalon = salonName?.trim();
  const [openPanels, setOpenPanels] = useState<Set<PrivacyPanelId>>(() => new Set(["controller"]));
  const [activeNav, setActiveNav] = useState<PrivacyPanelId>("controller");
  const [activeDataTile, setActiveDataTile] = useState<string>(DATA_TILES[0]?.id ?? "account");
  const isNativeApp = isLuxuryNativeAppShell();

  const panels = useMemo<PrivacyPanel[]>(
    () => [
      {
        id: "controller",
        title: "Chi tratta i dati",
        kicker: "Ruoli salone e piattaforma",
        content: (
          <>
            <p className="luxury-info-privacy-premium__text">
              <strong>Saloni Luxury</strong> tratta i dati necessari a registrare e gestire il tuo account titolare,
              l&apos;abbonamento Premium, la piattaforma tecnica (autenticazione, sicurezza, assistenza, notifiche di servizio e
              funzioni Premium come vetrina personalizzata, statistiche e report).
            </p>
            <p className="luxury-info-privacy-premium__text">{LEGAL_PROCESSING_ROLES_PARAGRAPH}</p>
            <p className="luxury-info-privacy-premium__text">
              Contatto piattaforma:{" "}
              {mailHref ? (
                <a className="luxury-info-privacy-premium__link" href={mailHref}>
                  {contactEmail}
                </a>
              ) : (
                contactEmail
              )}
              . Per richieste sui clienti del salone, il cliente può rivolgersi anche direttamente al salone.
            </p>
          </>
        ),
      },
      {
        id: "data",
        title: "Dati trattati e finalità",
        kicker: "Categorie operative del piano Premium",
        content: (
          <>
            <div className="luxury-info-privacy-premium__data-grid" role="list">
              {DATA_TILES.map((tile) => {
                const active = activeDataTile === tile.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    role="listitem"
                    className={`luxury-info-privacy-premium__data-tile${active ? " is-active" : ""}`}
                    aria-pressed={active}
                    onClick={() => setActiveDataTile(tile.id)}
                  >
                    <p className="luxury-info-privacy-premium__data-tile-title">{tile.title}</p>
                    <p className="luxury-info-privacy-premium__data-tile-text">{tile.text}</p>
                  </button>
                );
              })}
            </div>
            <p className="luxury-info-privacy-premium__text">
              Seleziona una categoria per evidenziarla. I dati sono trattati solo per le finalità collegate al servizio Premium
              attivo sul salone.
            </p>
          </>
        ),
      },
      {
        id: "geolocation",
        title: "Geolocalizzazione e posizione del salone",
        kicker: "Sede, mappa e ricerca geografica",
        content: (
          <>
            <p className="luxury-info-privacy-premium__text">
              Per il piano Premium trattiamo i dati di <strong>posizione del salone</strong> che inserisci o aggiorni in{" "}
              <Link to="/account/profilo" className="luxury-info-privacy-premium__link">
                Profilo
              </Link>{" "}
              e in{" "}
              <Link to="/account/salone/posizione" className="luxury-info-privacy-premium__link">
                Posizione del salone
              </Link>
              : indirizzo, città, CAP e, quando disponibili, <strong>coordinate geografiche</strong> della sede derivate da
              geocodifica. Servono a mostrare il salone su mappa, abilitare la <strong>ricerca geolocalizzata</strong> e
              calcolare la distanza rispetto ai clienti che cercano nella tua zona.
            </p>
            <p className="luxury-info-privacy-premium__text">
              Per gestire il salone <strong>non è richiesta la posizione GPS del tuo dispositivo</strong>: usiamo i dati della
              sede che fornisci. Se usi anche l&apos;area cliente, l&apos;eventuale geolocalizzazione del dispositivo per
              suggerimenti «vicino a me» è facoltativa, chiede il permesso del browser e segue le regole dell&apos;informativa
              per i clienti.
            </p>
            <p className="luxury-info-privacy-premium__text">
              L&apos;anteprima o l&apos;apertura di mappe può coinvolgere <strong>Google Maps</strong> (terza parte), che riceve
              i dati necessari a mostrare la posizione indicata.
            </p>
          </>
        ),
      },
      {
        id: "legal-basis",
        title: "Basi giuridiche",
        kicker: "Art. 6 GDPR",
        content: (
          <p className="luxury-info-privacy-premium__text">
            Il trattamento per l&apos;account, l&apos;abbonamento Premium, la pubblicazione della sede e le funzioni contrattuali
            (inclusa la visibilità in ricerca geolocalizzata) si fonda sull&apos;esecuzione del contratto o di misure
            precontrattuali (art. 6, par. 1, lett. b, GDPR). Per sicurezza, prevenzione di usi illeciti e tutela del servizio
            può essere invocato il legittimo interesse (art. 6, par. 1, lett. f), nel rispetto dei diritti degli interessati.
            Eventuali trattamenti facoltativi non necessari al servizio (ad esempio comunicazioni promozionali o geolocalizzazione
            del dispositivo in area cliente) richiedono un consenso revocabile, ove previsto.
          </p>
        ),
      },
      {
        id: "recipients",
        title: "Destinatari e terze parti",
        kicker: "Staff, fornitori e mappe",
        content: (
          <>
            <p className="luxury-info-privacy-premium__text">
              I dati possono essere accessibili allo <strong>staff autorizzato</strong> del salone secondo i permessi del piano
              Premium, ai <strong>fornitori tecnici</strong> che supportano hosting, infrastruttura, email transazionale e sicurezza,
              ai servizi di <strong>geocodifica</strong> usati per ricavare coordinate da indirizzo e CAP, e — per le funzioni di
              mappa — a <strong>Google Maps</strong> quando apri o incorpori mappe dal servizio
              {isNativeApp ? null : (
                <>
                  , e a <strong>Stripe</strong> quando attivi o gestisci l&apos;abbonamento Premium a pagamento
                </>
              )}
              . I fornitori sono vincolati a trattare i dati solo per le finalità del servizio e con misure adeguate.{" "}
              {LEGAL_PLATFORM_ADMIN_ACCESS_PARAGRAPH}
            </p>
            {isNativeApp ? null : (
              <p className="luxury-info-privacy-premium__text">{LEGAL_STRIPE_PAYMENT_PROCESSOR_PARAGRAPH}</p>
            )}
          </>
        ),
      },
      {
        id: "transfers",
        title: "Trasferimenti extra SEE",
        kicker: "Garanzie contrattuali",
        content: (
          <p className="luxury-info-privacy-premium__text">
            Se alcuni fornitori trattano dati al di fuori dello Spazio Economico Europeo, i trasferimenti avvengono solo con
            garanzie previste dal GDPR (ad esempio decisioni di adeguatezza o clausole contrattuali tipo), secondo quanto indicato
            negli accordi applicabili al servizio.
          </p>
        ),
      },
      {
        id: "retention",
        title: "Conservazione",
        kicker: "Durata e cancellazione",
        content: (
          <p className="luxury-info-privacy-premium__text">
            I dati sono conservati per il tempo necessario alle finalità indicate, alla durata del rapporto contrattuale e agli
            obblighi di legge applicabili. Dopo la chiusura dell&apos;account o su richiesta, i dati vengono cancellati o
            anonimizzati secondo procedure tecniche e legali, salvo conservazione obbligatoria o legittima per contestazioni o
            adempimenti normativi.
          </p>
        ),
      },
      {
        id: "rights",
        title: "Diritti degli interessati",
        kicker: "Artt. 15–22 GDPR",
        content: (
          <>
            <p className="luxury-info-privacy-premium__text">
              In qualità di titolare account puoi aggiornare molti dati da{" "}
              <Link to="/account/profilo" className="luxury-info-privacy-premium__link">
                Profilo
              </Link>
              . Puoi inoltre esercitare, ove applicabile, i diritti di accesso, rettifica, cancellazione, limitazione, opposizione
              e portabilità previsti dagli artt. 15–22 GDPR, e revocare un eventuale consenso senza pregiudicare la liceità del
              trattamento precedente.
            </p>
            <p className="luxury-info-privacy-premium__text">
              Per richieste sulla piattaforma scrivi a{" "}
              {mailHref ? (
                <a className="luxury-info-privacy-premium__link" href={mailHref}>
                  {contactEmail}
                </a>
              ) : (
                contactEmail
              )}{" "}
              o usa{" "}
              <Link to="/account/assistenza" className="luxury-info-privacy-premium__link">
                Assistenza
              </Link>
              . Hai diritto a proporre reclamo all&apos;autorità di controllo competente; in Italia:{" "}
              <a
                className="luxury-info-privacy-premium__link"
                href="https://www.garanteprivacy.it"
                target="_blank"
                rel="noopener noreferrer"
              >
                Garante per la protezione dei dati personali
              </a>
              .
            </p>
            <p className="luxury-info-privacy-premium__text">{LEGAL_RIGHTS_RESPONSE_PARAGRAPH}</p>
          </>
        ),
      },
      {
        id: "mandatory",
        title: "Obbligo di fornire i dati",
        kicker: "Campi necessari",
        content: (
          <p className="luxury-info-privacy-premium__text">
            I dati contrassegnati come necessari in registrazione o in Profilo sono richiesti per creare l&apos;account, pubblicare
            il salone e usare le funzioni Premium.
            {isNativeApp
              ? null
              : (
                  <>
                    {" "}
                    I dati di fatturazione sono richiesti in registrazione Premium e prima del checkout Stripe.{" "}
                    {LEGAL_PREMIUM_BILLING_DATA_PRIVACY_PARAGRAPH}
                  </>
                )}
          </p>
        ),
      },
      {
        id: "automated",
        title: "Decisioni automatizzate",
        kicker: "Nessun profilazione automatica",
        content: <p className="luxury-info-privacy-premium__text">{LEGAL_AUTOMATED_DECISIONS_PARAGRAPH}</p>,
      },
      {
        id: "updates",
        title: "Aggiornamenti",
        kicker: "Documenti ufficiali",
        content: (
          <p className="luxury-info-privacy-premium__text">
            Questa pagina riassume le informazioni essenziali in area account. Per il testo legalmente vincolante fanno stato i
            documenti pubblicati in{" "}
            <Link to="/privacy" className="luxury-info-privacy-premium__link">
              Informativa privacy
            </Link>{" "}
            e{" "}
            <Link to="/termini" className="luxury-info-privacy-premium__link">
              Termini di servizio
            </Link>
            , aggiornabili per adeguamento normativo o evoluzione del prodotto.
          </p>
        ),
      },
    ],
    [activeDataTile, contactEmail, isNativeApp, mailHref],
  );

  const progress = Math.round((openPanels.size / panels.length) * 100);

  const togglePanel = (id: PrivacyPanelId) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActiveNav(id);
  };

  const expandAll = () => {
    setOpenPanels(new Set(panels.map((panel) => panel.id)));
  };

  const collapseAll = () => {
    setOpenPanels(new Set());
  };

  const focusPanel = (id: PrivacyPanelId) => {
    setActiveNav(id);
    setOpenPanels((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const node = panelRefs.current[id];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  return (
    <div className="luxury-info-privacy-premium">
      <article className="luxury-info-privacy-premium__shell" aria-label="Informativa privacy salone Premium">
        <div className="luxury-info-privacy-premium__aurora" aria-hidden />
        <div className="luxury-info-privacy-premium__shine" aria-hidden />

        <header className="luxury-info-privacy-premium__header">
          <div className="luxury-info-privacy-premium__header-top">
            <div className="luxury-info-privacy-premium__badges">
              <span className="luxury-info-privacy-premium__badge">Piano Premium</span>
              <span className="luxury-info-privacy-premium__badge luxury-info-privacy-premium__badge--muted">GDPR art. 13</span>
            </div>
            <div className="luxury-info-privacy-premium__progress">
              <p className="luxury-info-privacy-premium__progress-label">
                Sezioni aperte {openPanels.size}/{panels.length}
              </p>
              <div className="luxury-info-privacy-premium__progress-track" aria-hidden>
                <div className="luxury-info-privacy-premium__progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <p className="luxury-info-privacy-premium__lead">
            Informativa sintetica per account titolare con piano Premium, redatta in linea con il principio di trasparenza del
            Regolamento (UE) 2016/679 (GDPR) e con le indicazioni del{" "}
            <a
              className="luxury-info-privacy-premium__link"
              href="https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/what-information-should-i_en"
              target="_blank"
              rel="noopener noreferrer"
            >
              European Data Protection Board
            </a>{" "}
            sulle informazioni da fornire agli interessati.
          </p>

          {namedSalon ? (
            <p className="luxury-info-privacy-premium__salon">
              Salone collegato: <strong>{namedSalon}</strong>
            </p>
          ) : null}
        </header>

        <div className="luxury-info-privacy-premium__toolbar">
          <button type="button" className="luxury-info-privacy-premium__toolbar-btn" onClick={expandAll}>
            Espandi tutto
          </button>
          <button type="button" className="luxury-info-privacy-premium__toolbar-btn" onClick={collapseAll}>
            Comprimi tutto
          </button>
        </div>

        <nav className="luxury-info-privacy-premium__nav" aria-label="Sezioni informativa privacy">
          {panels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              className={`luxury-info-privacy-premium__nav-chip${activeNav === panel.id ? " is-active" : ""}`}
              onClick={() => focusPanel(panel.id)}
            >
              {panel.title}
            </button>
          ))}
        </nav>

        <div className="luxury-info-privacy-premium__body">
          {panels.map((panel) => {
            const open = openPanels.has(panel.id);
            const regionId = `${baseId}-${panel.id}`;
            return (
              <section
                key={panel.id}
                ref={(node) => {
                  panelRefs.current[panel.id] = node;
                }}
                id={regionId}
                className={`luxury-info-privacy-premium__panel${open ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="luxury-info-privacy-premium__panel-trigger"
                  aria-expanded={open}
                  aria-controls={`${regionId}-content`}
                  onClick={() => togglePanel(panel.id)}
                >
                  <PanelIcon kind={panel.id} />
                  <span>
                    <h2 className="luxury-info-privacy-premium__panel-title">{panel.title}</h2>
                    <p className="luxury-info-privacy-premium__panel-kicker">{panel.kicker}</p>
                  </span>
                  <ChevronIcon />
                </button>
                <div
                  id={`${regionId}-content`}
                  className="luxury-info-privacy-premium__panel-content"
                  hidden={!open}
                >
                  <div className="luxury-info-privacy-premium__panel-inner">
                    <div className="luxury-info-privacy-premium__panel-copy">{panel.content}</div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {showAccountActions ? (
          <footer className="luxury-info-privacy-premium__actions">
            <Link to="/account/profilo" className="luxury-info-privacy-premium__action">
              <span className="luxury-info-privacy-premium__action-label">Account</span>
              <span className="luxury-info-privacy-premium__action-value">Apri Profilo</span>
            </Link>
            <Link to="/account/assistenza" className="luxury-info-privacy-premium__action">
              <span className="luxury-info-privacy-premium__action-label">Supporto</span>
              <span className="luxury-info-privacy-premium__action-value">Richiedi assistenza</span>
            </Link>
            {mailHref ? (
              <a href={mailHref} className="luxury-info-privacy-premium__action">
                <span className="luxury-info-privacy-premium__action-label">Email</span>
                <span className="luxury-info-privacy-premium__action-value">{contactEmail}</span>
              </a>
            ) : null}
          </footer>
        ) : null}
      </article>
    </div>
  );
}
