import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuxuryEmailLinkConfirmSuccessBox, LuxuryEmailLinkInvalidBox } from "./LuxuryEmailLinkConfirmSuccessBox";
import {
  EMAIL_CONFIRMED_CELEBRATION_HOLD_MS,
  LuxuryEmailConfirmedCelebrationBox,
  LuxuryEmailVerificationPendingBox,
} from "./LuxuryEmailVerifiedSuccessBox";
import { LuxuryPremiumCheckoutPromptPanel } from "./LuxuryPremiumCheckoutPromptPanel";
import { LuxuryPremiumSubscriptionSuccessBox } from "./LuxuryPremiumSubscriptionSuccessBox";
import { PREMIUM_SALON_POST_LOGIN_PATH } from "../lib/salonRegistrationPostLogin";
import { isTokenAlreadyUsedError, isValidEmailVerificationToken, successLeadFromApiMessage, clearEmailConfirmCaches } from "../lib/emailVerificationConfirmShared";
import type { UseEmailVerificationConfirmOptions } from "../hooks/useEmailVerificationConfirm";
import { useEmailVerificationConfirm } from "../hooks/useEmailVerificationConfirm";
import { LuxuryRegistrationThankYouBox } from "./LuxuryRegistrationThankYouBox";
import {
  LuxuryRegistrationEmailConfirmBox,
  type LuxuryRegistrationEmailConfirmBoxProps,
} from "./LuxuryRegistrationEmailConfirmBox";

type LuxuryRegistrationEmailConfirmFlowProps = LuxuryRegistrationEmailConfirmBoxProps &
  Pick<
    UseEmailVerificationConfirmOptions,
    | "tokenFromUrl"
    | "planParam"
    | "audience"
    | "registrationAt"
    | "surface"
  > & {
    listenForCrossTab?: boolean;
    thankYouMessage?: string | null;
    onHeroTitleChange?: (title: string) => void;
    /** Reload dopo la conferma: resta il ringraziamento, senza rifare il modulo. */
    resumeThankYou?: boolean;
  };

function shouldShowEmailConfirmedCelebration(
  phase: string,
  celebrationDone: boolean,
): boolean {
  /* Anche se phase è già "success", mostra prima il box Email confermata. */
  return !celebrationDone && (phase === "celebration" || phase === "success");
}

function shouldShowPostConfirmThankYou(
  phase: string,
  _confirmedAsClient: boolean,
  awaitingPremiumCheckout: boolean,
  awaitingPostConfirmCheckout: boolean,
  celebrationDone: boolean,
  postConfirmThankYouDone: boolean,
): boolean {
  if (postConfirmThankYouDone || awaitingPremiumCheckout || awaitingPostConfirmCheckout) return false;
  /* Ringraziamento solo dopo aver visto «Email confermata». */
  if (!celebrationDone) return false;
  return phase === "success" || phase === "celebration";
}

export function LuxuryRegistrationEmailConfirmFlow({
  tokenFromUrl,
  planParam = null,
  audience,
  listenForCrossTab = false,
  registrationAt = 0,
  surface = "registrationTab",
  thankYouMessage = null,
  onHeroTitleChange,
  resumeThankYou = false,
  ...boxProps
}: LuxuryRegistrationEmailConfirmFlowProps) {
  const hasValidToken = isValidEmailVerificationToken(tokenFromUrl);
  const isEmailLinkSurface = surface === "emailLink";
  const [postConfirmThankYouDone, setPostConfirmThankYouDone] = useState(false);
  const [celebrationDone, setCelebrationDone] = useState(false);
  const continueHomeLockRef = useRef(false);

  const verification = useEmailVerificationConfirm({
    tokenFromUrl,
    planParam,
    audience,
    registeredEmail: boxProps.email,
    listenForCrossTab,
    registrationAt,
    enabled: hasValidToken,
    surface,
  });

  const showCelebration = shouldShowEmailConfirmedCelebration(verification.phase, celebrationDone);

  const showPostConfirmThankYou = shouldShowPostConfirmThankYou(
    verification.phase,
    verification.confirmedAsClient,
    verification.awaitingPremiumCheckout,
    verification.awaitingPostConfirmCheckout,
    celebrationDone,
    postConfirmThankYouDone,
  );

  useLayoutEffect(() => {
    if (surface !== "registrationTab") return;
    if (!showCelebration && !showPostConfirmThankYou) return;
    window.scrollTo(0, 0);
    const root = document.scrollingElement;
    if (root) root.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [showCelebration, showPostConfirmThankYou, surface]);

  useEffect(() => {
    if (!onHeroTitleChange) return;
    if (isEmailLinkSurface) {
      if (verification.phase === "link_confirmed") {
        onHeroTitleChange("Email confermata");
        return;
      }
      if (verification.phase === "confirming") {
        onHeroTitleChange("Conferma in corso");
        return;
      }
      onHeroTitleChange("Conferma email");
      return;
    }
    if (showCelebration) {
      onHeroTitleChange("Email confermata");
      return;
    }
    if (showPostConfirmThankYou) {
      onHeroTitleChange("Registrazione completata");
      return;
    }
    if (verification.phase === "confirming") {
      onHeroTitleChange("Conferma in corso");
      return;
    }
    onHeroTitleChange("Controlla la tua email");
  }, [isEmailLinkSurface, onHeroTitleChange, showCelebration, showPostConfirmThankYou, verification.phase]);

  useEffect(() => {
    setPostConfirmThankYouDone(false);
    setCelebrationDone(false);
  }, [tokenFromUrl, registrationAt]);

  if (isEmailLinkSurface) {
    if (verification.phase === "confirming") {
      return <LuxuryEmailVerificationPendingBox />;
    }
    if (verification.phase === "error" && verification.confirmErr) {
      return <LuxuryEmailLinkInvalidBox alreadyUsed={isTokenAlreadyUsedError(verification.confirmErr)} />;
    }
    if (verification.phase === "link_confirmed") {
      return <LuxuryEmailLinkConfirmSuccessBox />;
    }
    return <LuxuryEmailVerificationPendingBox />;
  }

  const handlePostConfirmContinue = () => {
    if (verification.confirmedAsClient || audience === "client") {
      /* Non smontare il ringraziamento: il frame dopo mostrerebbe «Controlla la tua email» prima della home. */
      if (continueHomeLockRef.current) return;
      continueHomeLockRef.current = true;
      void verification.goToClientHomeAfterCelebration();
      return;
    }

    setPostConfirmThankYouDone(true);

    if (audience === "salon" && verification.postVerifyLoginPath === PREMIUM_SALON_POST_LOGIN_PATH) {
      verification.goToPremiumCheckout();
      return;
    }

    verification.goToSalonDestinationAfterCelebration();
  };

  if (resumeThankYou && !postConfirmThankYouDone) {
    const thankYouLead = verification.confirmMsg
      ? successLeadFromApiMessage(verification.confirmMsg)
      : thankYouMessage;
    return (
      <LuxuryRegistrationThankYouBox
        accountLabel={boxProps.accountLabel}
        message={thankYouLead}
        extraNote={boxProps.extraNote}
        onContinue={handlePostConfirmContinue}
      />
    );
  }

  const showWaitingBox =
    !verification.hasValidToken &&
    !verification.crossTabConfirmed &&
    verification.phase === "idle";

  if (showWaitingBox) {
    return <LuxuryRegistrationEmailConfirmBox {...boxProps} />;
  }

  if (verification.phase === "confirming") {
    return <LuxuryEmailVerificationPendingBox />;
  }

  if (verification.phase === "error" && verification.confirmErr) {
    return (
      <section className="luxury-email-confirm-box" aria-live="polite">
        <p className="luxury-alert luxury-alert--error luxury-email-confirm-box__alert" role="alert">
          {verification.confirmErr}
        </p>
        {isTokenAlreadyUsedError(verification.confirmErr) ? (
          <p className="luxury-email-confirm-box__email-edit-hint">
            Se hai già cliccato il link, l&apos;account potrebbe essere già attivo:{" "}
            <Link className="luxury-link-inline" to={verification.postVerifyLoginPath}>
              accedi con email e password
            </Link>
            .
          </p>
        ) : null}
      </section>
    );
  }

  if (showCelebration) {
    return (
      <LuxuryEmailConfirmedCelebrationBox
        holdMs={EMAIL_CONFIRMED_CELEBRATION_HOLD_MS}
        onHoldComplete={() => {
          setCelebrationDone(true);
          verification.finishCelebrationHold();
        }}
      />
    );
  }

  if (showPostConfirmThankYou) {
    const thankYouLead = verification.confirmMsg
      ? successLeadFromApiMessage(verification.confirmMsg)
      : thankYouMessage;
    return (
      <LuxuryRegistrationThankYouBox
        accountLabel={boxProps.accountLabel}
        message={thankYouLead}
        extraNote={boxProps.extraNote}
        onContinue={handlePostConfirmContinue}
      />
    );
  }

  if (verification.premiumRegistrationPaid || verification.phase === "premium_paid") {
    return (
      <LuxuryPremiumSubscriptionSuccessBox
        activationPending={false}
        continueTo={verification.premiumPaidContinueTo}
        onContinue={verification.goToSalonAfterPremiumPaid}
      />
    );
  }

  if (
    (verification.awaitingPremiumCheckout || verification.awaitingPostConfirmCheckout) &&
    verification.premiumConfirmStep === "checkout"
  ) {
    return (
      <LuxuryPremiumCheckoutPromptPanel
        onContinue={verification.goToPremiumCheckout}
        busy={verification.checkoutRedirectBusy}
        error={verification.premiumCheckoutError}
        className="luxury-premium-checkout-prompt--registration"
      />
    );
  }

  return (
    <section className="luxury-email-confirm-box" aria-live="polite">
      <p className="luxury-email-confirm-box__email-edit-hint">
        La conferma non è partita automaticamente.
      </p>
      <button
        type="button"
        className="luxury-email-confirm-box__cta luxury-email-confirm-box__cta--primary"
        onClick={() => {
          if (tokenFromUrl) clearEmailConfirmCaches(tokenFromUrl);
          window.location.reload();
        }}
      >
        Riprova conferma
      </button>
    </section>
  );
}
