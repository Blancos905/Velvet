import { AccountHubNavLink } from "./AccountHubNavLink";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
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
  const t = useLuxuryT();

  return (
    <div
      className="luxury-account-hub__nav-scroll luxury-account-hub__nav-scroll--consumer-grid"
      aria-label={t("account.nav.main")}
    >
      {!isSalonTitolare ? (
        <AccountHubNavLink to="/" className={navBtn()}>
          {t("account.nav.searchArea")}
        </AccountHubNavLink>
      ) : null}
      {isSalonTitolare ? (
        <AccountHubNavLink to="/salone/servizi" className={navBtn()}>
          <span className="luxury-account-hub__btn-notif">{t("account.nav.addServices")}</span>
        </AccountHubNavLink>
      ) : null}
      {isSalonTitolare ? (
        <AccountHubNavLink
          to={showPremiumSalonNav ? "/salone/strumenti" : "/account/notifiche"}
          className={navBtn()}
          title={t("account.nav.notificationsSalonTitle")}
        >
          <span className="luxury-account-hub__btn-notif">
            {t("account.nav.notifications")}
            {showSalonNotificheNavPill ? (
              <span
                className="luxury-account-hub__notif-pill"
                title={`${notifInboxAttentionTotal}`}
              >
                {notifInboxAttentionTotal > 99 ? "99+" : notifInboxAttentionTotal}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      <AccountHubNavLink to="/account/prenotazioni" className={navBtn()}>
        {isSalonTitolare ? (
          <span className="luxury-account-hub__btn-notif">{t("account.nav.agenda")}</span>
        ) : (
          t("account.nav.bookings")
        )}
      </AccountHubNavLink>
      {!isSalonTitolare ? (
        <AccountHubNavLink to="/account/chat" className={navBtn()} title={t("account.nav.chatClientTitle")}>
          <span className="luxury-account-hub__btn-notif">
            {t("account.nav.chat")}
            {showClientChatNavPill ? (
              <span className="luxury-account-hub__notif-pill" title={`${clientChatUnread}`}>
                {clientChatUnread > 99 ? "99+" : clientChatUnread}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      {!isSalonTitolare ? (
        <AccountHubNavLink to="/account/notifiche" className={navBtn()}>
          <span className="luxury-account-hub__btn-notif">
            {t("account.nav.notifications")}
            {showConsumerNotificheNavPill ? (
              <span className="luxury-account-hub__notif-pill">
                {consumerNotifAttentionTotal > 99 ? "99+" : consumerNotifAttentionTotal}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      <AccountHubNavLink to="/account/profilo" className={navBtn()}>
        {t("account.nav.profile")}
      </AccountHubNavLink>
      {!isSalonTitolare ? (
        <AccountHubNavLink
          to="/account/saloni-di-fiducia"
          className={navBtn()}
          title={t("account.nav.trustedSalonsTitle")}
        >
          <span className="luxury-account-hub__btn-notif">
            {t("account.nav.trustedSalons")}
            {showTrustedSalonsNavPill ? (
              <span className="luxury-account-hub__notif-pill" title={`${trustedSalonsNavBadge}`}>
                {trustedSalonsNavBadge > 99 ? "99+" : trustedSalonsNavBadge}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      {!isSalonTitolare || showPremiumSalonNav ? (
      <AccountHubNavLink to="/account/feedback-luxury" className={navBtn()}>
        <span className="luxury-account-hub__btn-notif">
          {t("account.nav.reviews")}
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
      ) : null}
      {showPremiumSalonNav ? (
        <AccountHubNavLink
          to="/salone/clienti"
          className={navBtn()}
          title={t("account.nav.clientsTitle")}
        >
          <span className="luxury-account-hub__btn-notif">
            {t("account.nav.clients")}
            {showSalonClientsNavPill ? (
              <span className="luxury-account-hub__notif-pill" title={`${salonClientsNavBadge}`}>
                {salonClientsNavBadge > 99 ? "99+" : salonClientsNavBadge}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      {showPremiumSalonNav ? (
        <AccountHubNavLink to="/account/chat" className={navBtn()} title={t("account.nav.chatOwnerTitle")}>
          <span className="luxury-account-hub__btn-notif">
            {t("account.nav.chat")}
            {showOwnerChatNavPill ? (
              <span className="luxury-account-hub__notif-pill" title={`${ownerChatUnread}`}>
                {ownerChatUnread > 99 ? "99+" : ownerChatUnread}
              </span>
            ) : null}
          </span>
        </AccountHubNavLink>
      ) : null}
      <AccountHubNavLink to="/account/info-privacy" className={navBtn()} title={t("account.nav.privacyTitle")}>
        {t("account.nav.privacy")}
      </AccountHubNavLink>
      <AccountHubNavLink to="/account/assistenza" className={navBtn()}>
        {t("account.nav.support")}
      </AccountHubNavLink>
    </div>
  );
}
