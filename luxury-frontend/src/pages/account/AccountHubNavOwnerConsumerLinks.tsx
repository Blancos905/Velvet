import { AccountHubNavLink } from "./AccountHubNavLink";
import { isLuxuryNativeAppShell } from "../../hooks/useLuxuryNativeAppShell";
import { accountHubNavBtn } from "./accountHubNavBtn";

const navBtn = accountHubNavBtn;

export type AccountHubNavOwnerConsumerLinksProps = {
  isSalonTitolare: boolean;
  showPremiumSalonNav: boolean;
  notifInboxAttentionTotal: number;
  showSalonNotificheNavPill: boolean;
  consumerNotifAttentionTotal: number;
  showConsumerNotificheNavPill: boolean;
  clientChatUnread: number;
  showClientChatNavPill: boolean;
  salonReviewUnreadCount: number;
  clientReviewPendingCount: number;
  showSalonReviewsNavPill: boolean;
  showClientReviewsNavPill: boolean;
  salonClientsNavBadge: number;
  showSalonClientsNavPill: boolean;
  ownerChatUnread: number;
  showOwnerChatNavPill: boolean;
  trustedSalonsNavBadge: number;
  showTrustedSalonsNavPill: boolean;
};

/** Link hub condivisi tra cliente e titolare (senza strumenti Premium-only tipo sito/brand/statistiche). */
export function AccountHubNavOwnerConsumerLinks({
  isSalonTitolare,
  showPremiumSalonNav,
  notifInboxAttentionTotal,
  showSalonNotificheNavPill,
  consumerNotifAttentionTotal,
  showConsumerNotificheNavPill,
  clientChatUnread,
  showClientChatNavPill,
  salonReviewUnreadCount,
  clientReviewPendingCount,
  showSalonReviewsNavPill,
  showClientReviewsNavPill,
  salonClientsNavBadge,
  showSalonClientsNavPill,
  ownerChatUnread,
  showOwnerChatNavPill,
  trustedSalonsNavBadge,
  showTrustedSalonsNavPill,
}: AccountHubNavOwnerConsumerLinksProps) {
  const isNativeApp = isLuxuryNativeAppShell();
  const showFreeSalonShortcuts = isSalonTitolare && !showPremiumSalonNav && !isNativeApp;
  const showFreeSalonNativeHome = isSalonTitolare && !showPremiumSalonNav && isNativeApp;

  return (
    <div
      className="luxury-account-hub__nav-scroll luxury-account-hub__nav-scroll--consumer-grid"
      aria-label="Menu principale account"
    >
      {showFreeSalonShortcuts ? (
        <>
          <AccountHubNavLink to="/account/salone" className={navBtn()}>
            Il mio salone
          </AccountHubNavLink>
          <AccountHubNavLink to="/account/salone/posizione" className={navBtn()}>
            Posizione del salone
          </AccountHubNavLink>
        </>
      ) : null}
      {showFreeSalonNativeHome ? (
        <AccountHubNavLink to="/account/salone" className={navBtn()}>
          Il mio salone
        </AccountHubNavLink>
      ) : null}
      {!isSalonTitolare ? (
        <AccountHubNavLink to="/" className={navBtn()}>
          Area di ricerca
        </AccountHubNavLink>
      ) : null}
      {isSalonTitolare ? (
        <AccountHubNavLink to="/account/salone/servizi" className={navBtn()}>
          <span className="luxury-account-hub__btn-notif">Aggiungi servizi</span>
        </AccountHubNavLink>
      ) : null}
      {isSalonTitolare ? (
        <AccountHubNavLink
          to={showPremiumSalonNav ? "/account/salone/strumenti" : "/account/notifiche"}
          className={navBtn()}
          title="Centro notifiche salone: prenotazioni e messaggi in evidenza."
        >
          <span className="luxury-account-hub__btn-notif">
            Notifiche
            {showSalonNotificheNavPill ? (
              <span
                className="luxury-account-hub__notif-pill"
                title={`Da gestire in notifiche: ${notifInboxAttentionTotal} (in coda + inviate in evidenza)`}
              >
                {notifInboxAttentionTotal > 99 ? "99+" : notifInboxAttentionTotal}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      <AccountHubNavLink to="/account/prenotazioni" className={navBtn()}>
        {isSalonTitolare ? (
          <span className="luxury-account-hub__btn-notif">Agenda</span>
        ) : (
          "Prenotazioni"
        )}
      </AccountHubNavLink>
      {!isSalonTitolare ? (
        <AccountHubNavLink to="/account/chat" className={navBtn()} title="Messaggi con i saloni di cui sei cliente.">
          <span className="luxury-account-hub__btn-notif">
            Chat
            {showClientChatNavPill ? (
              <span className="luxury-account-hub__notif-pill" title={`Messaggi non letti: ${clientChatUnread}`}>
                {clientChatUnread > 99 ? "99+" : clientChatUnread}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      {!isSalonTitolare ? (
        <AccountHubNavLink to="/account/notifiche" className={navBtn()}>
          <span className="luxury-account-hub__btn-notif">
            Notifiche
            {showConsumerNotificheNavPill ? (
              <span className="luxury-account-hub__notif-pill">
                {consumerNotifAttentionTotal > 99 ? "99+" : consumerNotifAttentionTotal}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      <AccountHubNavLink to="/account/profilo" className={navBtn()}>
        Profilo
      </AccountHubNavLink>
      {isSalonTitolare && !showPremiumSalonNav ? (
        <AccountHubNavLink to="/account/salone/staff" className={navBtn()}>
          Staff
        </AccountHubNavLink>
      ) : null}
      {!isSalonTitolare ? (
        <AccountHubNavLink
          to="/account/saloni-di-fiducia"
          className={navBtn()}
          title="Saloni presso cui sei registrato come cliente; il numerino segnala nuovi legami dall’ultima volta che hai aperto l’elenco."
        >
          <span className="luxury-account-hub__btn-notif">
            Saloni di fiducia
            {showTrustedSalonsNavPill ? (
              <span
                className="luxury-account-hub__notif-pill"
                title={`Nuovi saloni di fiducia: ${trustedSalonsNavBadge}`}
              >
                {trustedSalonsNavBadge > 99 ? "99+" : trustedSalonsNavBadge}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      <AccountHubNavLink to="/account/feedback-luxury" className={navBtn()}>
        <span className="luxury-account-hub__btn-notif">
          Recensioni
          {showSalonReviewsNavPill || showClientReviewsNavPill ? (
            <span className="luxury-account-hub__notif-pill">
              {isSalonTitolare
                ? salonReviewUnreadCount > 99
                  ? "99+"
                  : salonReviewUnreadCount
                : clientReviewPendingCount > 99
                  ? "99+"
                  : clientReviewPendingCount}
            </span>
          ) : null}
        </span>
      </AccountHubNavLink>
      {showPremiumSalonNav ? (
        <AccountHubNavLink
          to="/account/salone/clienti"
          className={navBtn()}
          title="Elenco clienti della sede; il numerino indica quanti clienti sono stati aggiunti dall’ultima volta che hai aperto questa pagina."
        >
          <span className="luxury-account-hub__btn-notif">
            Clienti
            {showSalonClientsNavPill ? (
              <span
                className="luxury-account-hub__notif-pill"
                title={`Nuovi clienti da vedere: ${salonClientsNavBadge}`}
              >
                {salonClientsNavBadge > 99 ? "99+" : salonClientsNavBadge}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      {showPremiumSalonNav ? (
        <AccountHubNavLink to="/account/chat" className={navBtn()} title="Chat con i clienti collegati al salone.">
          <span className="luxury-account-hub__btn-notif">
            Chat
            {showOwnerChatNavPill ? (
              <span className="luxury-account-hub__notif-pill" title={`Messaggi dai clienti: ${ownerChatUnread}`}>
                {ownerChatUnread > 99 ? "99+" : ownerChatUnread}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      <AccountHubNavLink to="/account/info-privacy" className={navBtn()} title="Informazioni sul trattamento dati e privacy.">
        Info e privacy
      </AccountHubNavLink>
      <AccountHubNavLink to="/account/assistenza" className={navBtn()}>
        Assistenza
      </AccountHubNavLink>
    </div>
  );
}
