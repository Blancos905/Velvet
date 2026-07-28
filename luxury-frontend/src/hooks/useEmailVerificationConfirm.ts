import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson } from "../api/client";
import { pollEmailVerificationSync } from "../api/emailVerificationPoll";
import { startPremiumCheckout } from "../api/billing";
import {
  startPremiumRegistrationCheckout,
} from "../api/premiumRegistrationCheckout";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { LUXURY_ACCESS_TOKEN_KEY } from "../auth/adminSession";
import { refreshLuxuryAccessToken, writeStoredRefreshToken, clearStoredRefreshToken } from "../auth/luxuryRefreshSession";
import { parseSalonPlanTier } from "../data/salonPlans";
import {
  clearIntendedSalonPlan,
  loginReturnPathForSalonRegistration,
  PREMIUM_SALON_POST_LOGIN_PATH,
  readIntendedSalonPlanFromSession,
  setPostLoginPathForSalonRegistration,
} from "../lib/salonRegistrationPostLogin";
import { isSalonPremiumCheckoutRequired } from "../lib/salonPremiumCheckoutPolicy";
import { useSalonPremiumCheckoutPolicyQuery } from "./useSalonPremiumCheckoutPolicy";
import { setPostLoginReturnPath, clearPostLoginReturnPath } from "../lib/postLoginReturnPath";
import {
  cacheConfirmMessage,
  cacheConfirmSession,
  clearPendingEmailVerification,
  clearSalonRegistrationPostSignupActive,
  markSalonRegistrationPostSignupActive,
  CLIENT_POST_EMAIL_CONFIRM_PATH,
  type EmailVerificationConfirmResponse,
  isClientRegistrationEmailConfirm,
  isValidEmailVerificationToken,
  acquireEmailConfirmAttempt,
  clearEmailConfirmCaches,
  hasOrphanEmailConfirmMessageCache,
  releaseEmailConfirmAttempt,
  readCachedConfirmMessage,
  readCachedConfirmSession,
  readPendingEmailVerification,
  readPendingEmailVerificationAt,
  type RegistrationEmailVerificationAudience,
} from "../lib/emailVerificationConfirmShared";
import {
  notifyEmailVerifiedCrossTab,
  readEmailVerifiedCrossTabPayload,
  subscribeEmailVerifiedCrossTab,
  clearEmailVerifiedCrossTab,
  type EmailVerifiedCrossTabPayload,
} from "../lib/emailVerificationCrossTab";
import {
  readPremiumRegistrationPaidCrossTabPayload,
  subscribePremiumRegistrationPaidCrossTab,
  type PremiumRegistrationPaidCrossTabPayload,
} from "../lib/premiumRegistrationPaidCrossTab";
import { SALON_OWNER_HOME_PATH } from "../lib/salonPremiumCheckoutPolicy";
import { isLuxuryNativeAppShell } from "./useLuxuryNativeAppShell";
import { normalizeNativeDevPageHost } from "../lib/nativeAppDevHost";

export type EmailVerificationConfirmPhase =
  | "idle"
  | "confirming"
  | "link_confirmed"
  | "celebration"
  | "checkout"
  | "premium_paid"
  | "success"
  | "error";

/** `emailLink` = pagina aperta dal link nell'email; `registrationTab` = scheda registrazione con step successivi. */
export type EmailVerificationConfirmSurface = "registrationTab" | "emailLink";

export type UseEmailVerificationConfirmOptions = {
  tokenFromUrl: string;
  planParam: string | null;
  audience: RegistrationEmailVerificationAudience;
  /** Email attesa (scheda «Controlla email») per sync cross-tab. */
  registeredEmail?: string;
  /** Ascolta conferma da un'altra scheda (senza token in URL). */
  listenForCrossTab?: boolean;
  /** Timestamp registrazione in corso (per sync cross-tab). */
  registrationAt?: number;
  /** Se false, non avvia la conferma automatica (es. redirect legacy in corso). */
  enabled?: boolean;
  /** Dove gira il flusso: link email (solo conferma) vs scheda registrazione (celebrazione, pagamento, ringraziamento). */
  surface?: EmailVerificationConfirmSurface;
};

function clearStaleLuxurySessionForClientConfirm(): void {
  clearPostLoginReturnPath();
  clearStoredRefreshToken();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(LUXURY_ACCESS_TOKEN_KEY);
  }
}

function resolvePostConfirmNextPath(
  body: EmailVerificationConfirmResponse,
  premiumCheckoutRequired: boolean,
): string {
  return (
    body.nextPath?.trim() ||
    loginReturnPathForSalonRegistration(readIntendedSalonPlanFromSession(), premiumCheckoutRequired)
  );
}

function isPremiumCheckoutPostConfirmPath(path: string): boolean {
  return path === PREMIUM_SALON_POST_LOGIN_PATH;
}

/**
 * Registrazione Premium in corso (piano scelto / checkout token), non «Stripe abilitato in piattaforma».
 * Usare solo per il ramo pagamento completato — altrimenti Free salta celebration.
 */
function isPremiumSalonRegistrationInProgress(pendingCheckoutToken?: string | null): boolean {
  return (
    readIntendedSalonPlanFromSession() === "PREMIUM" || Boolean(pendingCheckoutToken?.trim())
  );
}

function emailsMatch(a: string | undefined, b: string | undefined): boolean {
  const left = a?.trim().toLowerCase() ?? "";
  const right = b?.trim().toLowerCase() ?? "";
  return Boolean(left && right && left === right);
}

export function useEmailVerificationConfirm({
  tokenFromUrl,
  planParam,
  audience,
  registeredEmail = "",
  listenForCrossTab = false,
  registrationAt = 0,
  enabled = true,
  surface = "registrationTab",
}: UseEmailVerificationConfirmOptions) {
  const isEmailLinkSurface = surface === "emailLink";
  const navigate = useNavigate();
  const { signInWithIssuedToken, signOutForAccountSwitch } = useLuxuryAuth();
  const checkoutPolicy = useSalonPremiumCheckoutPolicyQuery();
  const premiumCheckoutRequired = isSalonPremiumCheckoutRequired(checkoutPolicy.data);

  const hasValidToken = isValidEmailVerificationToken(tokenFromUrl);
  const cachedSessionOnMount = hasValidToken ? readCachedConfirmSession(tokenFromUrl) : null;

  const [phase, setPhase] = useState<EmailVerificationConfirmPhase>(() => {
    if (isEmailLinkSurface && hasValidToken) {
      if (cachedSessionOnMount?.message || readCachedConfirmMessage(tokenFromUrl)) return "link_confirmed";
      return "confirming";
    }
    if (hasValidToken && cachedSessionOnMount?.premiumCheckoutToken?.trim()) return "checkout";
    if (hasValidToken && cachedSessionOnMount?.message) return "success";
    if (hasValidToken) return "confirming";
    return "idle";
  });
  const [confirmMsg, setConfirmMsg] = useState<string | null>(() =>
    hasValidToken ? readCachedConfirmMessage(tokenFromUrl) ?? cachedSessionOnMount?.message ?? null : null,
  );
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [redirectingAfterConfirm, setRedirectingAfterConfirm] = useState(false);
  const [premiumConfirmStep, setPremiumConfirmStep] = useState<"celebration" | "checkout">("celebration");
  const [checkoutRedirectBusy, setCheckoutRedirectBusy] = useState(false);
  const [premiumCheckoutError, setPremiumCheckoutError] = useState<string | null>(null);
  const [awaitingPostConfirmCheckout, setAwaitingPostConfirmCheckout] = useState(false);
  const [confirmedAsClient, setConfirmedAsClient] = useState(() =>
    cachedSessionOnMount
      ? isClientRegistrationEmailConfirm(
          cachedSessionOnMount,
          planParam,
          parseSalonPlanTier,
          readIntendedSalonPlanFromSession,
          audience,
        )
      : false,
  );
  const [confirmedNextPath, setConfirmedNextPath] = useState<string | null>(() =>
    cachedSessionOnMount?.nextPath?.trim() ? cachedSessionOnMount.nextPath.trim() : null,
  );
  const [crossTabConfirmed, setCrossTabConfirmed] = useState(false);
  const [premiumRegistrationPaid, setPremiumRegistrationPaid] = useState(false);
  const [premiumPaidContinueTo, setPremiumPaidContinueTo] = useState(SALON_OWNER_HOME_PATH);

  /** Tiene vivo il flow Free su `/piani` mentre celebration/thank-you sono a schermo (login post-confirm). */
  useEffect(() => {
    if (audience !== "salon") return;
    if (phase !== "celebration" && phase !== "success") return;
    markSalonRegistrationPostSignupActive();
  }, [audience, phase]);

  const issuedAccessTokenRef = useRef<string | null>(null);
  const pendingPremiumCheckoutTokenRef = useRef<string | null>(
    cachedSessionOnMount?.premiumCheckoutToken?.trim() ? cachedSessionOnMount.premiumCheckoutToken.trim() : null,
  );
  const [pendingPremiumCheckoutToken, setPendingPremiumCheckoutToken] = useState<string | null>(
    cachedSessionOnMount?.premiumCheckoutToken?.trim() ? cachedSessionOnMount.premiumCheckoutToken.trim() : null,
  );

  const confirmAttempted = useRef(false);
  const confirmSucceededRef = useRef(false);
  const resumeAttemptedRef = useRef(false);
  const sessionCompletionRef = useRef(false);
  const crossTabHandledRef = useRef(false);
  const premiumPaidHandledRef = useRef(false);

  const awaitingPremiumCheckout = Boolean(pendingPremiumCheckoutToken?.trim());
  const intendedSalonPlan = readIntendedSalonPlanFromSession();
  const postVerifyLoginPath =
    confirmedNextPath ?? loginReturnPathForSalonRegistration(intendedSalonPlan, premiumCheckoutRequired);

  const beginPremiumCheckoutCelebration = useCallback((checkoutToken: string, message?: string | null) => {
    const token = checkoutToken.trim();
    pendingPremiumCheckoutTokenRef.current = token;
    setPendingPremiumCheckoutToken(token);
    setPremiumConfirmStep("celebration");
    setAwaitingPostConfirmCheckout(false);
    if (message?.trim()) {
      setConfirmMsg(message.trim());
    }
    setConfirmErr(null);
    setPhase("celebration");
  }, []);

  const finishCelebrationHold = useCallback(() => {
    if (awaitingPremiumCheckout || awaitingPostConfirmCheckout) {
      setPremiumConfirmStep("checkout");
      return;
    }
    setPhase("success");
  }, [awaitingPostConfirmCheckout, awaitingPremiumCheckout]);

  const applyPremiumPaidPayload = useCallback(
    async (payload: PremiumRegistrationPaidCrossTabPayload | EmailVerificationConfirmResponse & {
      email?: string;
    }) => {
      if (premiumPaidHandledRef.current || audience !== "salon") return;

      const accessToken = payload.accessToken?.trim() ?? "";
      if (!accessToken) return;
      if ("premiumCheckoutToken" in payload && payload.premiumCheckoutToken?.trim()) return;

      premiumPaidHandledRef.current = true;
      pendingPremiumCheckoutTokenRef.current = null;
      setPendingPremiumCheckoutToken(null);
      setAwaitingPostConfirmCheckout(false);
      setCheckoutRedirectBusy(false);
      setPremiumCheckoutError(null);

      const rawNext = payload.nextPath?.trim() ?? "";
      const nextPath =
        rawNext === SALON_OWNER_HOME_PATH || rawNext.startsWith("/account/")
          ? rawNext
          : SALON_OWNER_HOME_PATH;
      setPremiumPaidContinueTo(nextPath);
      setConfirmMsg(payload.message?.trim() || "Pagamento completato. Il tuo salone Premium è attivo.");
      setConfirmErr(null);

      sessionCompletionRef.current = true;
      if (payload.refreshToken?.trim()) writeStoredRefreshToken(payload.refreshToken.trim());
      await signInWithIssuedToken(accessToken);
      issuedAccessTokenRef.current = accessToken;

      clearPendingEmailVerification();
      setPremiumRegistrationPaid(true);
      setPhase("premium_paid");
    },
    [audience, signInWithIssuedToken],
  );

  const tryApplyPollPaymentComplete = useCallback(
    (body: EmailVerificationConfirmResponse) => {
      const accessToken = body.accessToken?.trim() ?? "";
      if (!accessToken || body.premiumCheckoutToken?.trim()) return false;
      if (audience !== "salon") return false;
      if (!isPremiumSalonRegistrationInProgress(pendingPremiumCheckoutTokenRef.current)) return false;
      void applyPremiumPaidPayload(body);
      return true;
    },
    [applyPremiumPaidPayload, audience],
  );

  const applyCrossTabPayload = useCallback(
    async (payload: EmailVerifiedCrossTabPayload) => {
      if (crossTabHandledRef.current) return;
      if (payload.audience !== audience) return;
      const expectedEmail = registeredEmail.trim().toLowerCase() || readPendingEmailVerification();
      if (!emailsMatch(expectedEmail, payload.email)) return;
      const effectiveRegistrationAt = registrationAt || readPendingEmailVerificationAt();
      if (effectiveRegistrationAt > 0 && payload.registrationAt !== effectiveRegistrationAt) return;

      crossTabHandledRef.current = true;
      setCrossTabConfirmed(true);
      setConfirmMsg(payload.message);
      setConfirmErr(null);
      markSalonRegistrationPostSignupActive();

      if (payload.premiumCheckoutToken?.trim()) {
        beginPremiumCheckoutCelebration(payload.premiumCheckoutToken, payload.message);
        return;
      }

      const accessToken = payload.accessToken?.trim() ?? "";
      /* Solo Premium già pagato — NON usare premiumCheckoutRequired (rompe Free). */
      if (
        accessToken &&
        audience === "salon" &&
        isPremiumSalonRegistrationInProgress(pendingPremiumCheckoutTokenRef.current)
      ) {
        await applyPremiumPaidPayload(payload);
        return;
      }

      if (
        audience === "client" ||
        isClientRegistrationEmailConfirm(payload, planParam, parseSalonPlanTier, readIntendedSalonPlanFromSession, audience)
      ) {
        const accessToken = payload.accessToken?.trim() ?? "";
        if (!accessToken) {
          return;
        }
        setPhase("celebration");
        await signOutForAccountSwitch();
        clearStaleLuxurySessionForClientConfirm();
        sessionCompletionRef.current = true;
        if (payload.refreshToken?.trim()) writeStoredRefreshToken(payload.refreshToken.trim());
        await signInWithIssuedToken(accessToken);
        issuedAccessTokenRef.current = accessToken;
        setConfirmedAsClient(true);
        setConfirmedNextPath(CLIENT_POST_EMAIL_CONFIRM_PATH);
        return;
      }

      const nextPath = resolvePostConfirmNextPath(payload, premiumCheckoutRequired);
      setConfirmedNextPath(nextPath);
      setPostLoginReturnPath(nextPath);

      if (!accessToken) {
        if (payload.premiumCheckoutToken?.trim() || payload.message?.trim()) {
          setPremiumConfirmStep("celebration");
          setPhase("celebration");
        }
        return;
      }

      /* Celebration subito: evita che login + me/salon reindirizzino via prima del box. */
      if (isPremiumCheckoutPostConfirmPath(nextPath)) {
        setAwaitingPostConfirmCheckout(true);
      }
      setPremiumConfirmStep("celebration");
      setPhase("celebration");

      sessionCompletionRef.current = true;
      if (payload.refreshToken?.trim()) writeStoredRefreshToken(payload.refreshToken.trim());
      await signInWithIssuedToken(accessToken);
      issuedAccessTokenRef.current = accessToken;
    },
    [
      audience,
      planParam,
      premiumCheckoutRequired,
      registeredEmail,
      registrationAt,
      signInWithIssuedToken,
      signOutForAccountSwitch,
      beginPremiumCheckoutCelebration,
      applyPremiumPaidPayload,
    ],
  );

  const completeClientPostConfirmSession = useCallback(
    async (body: EmailVerificationConfirmResponse): Promise<boolean> => {
      const accessToken = body.accessToken?.trim() ?? "";
      if (!accessToken) return false;

      await signOutForAccountSwitch();
      clearStaleLuxurySessionForClientConfirm();

      sessionCompletionRef.current = true;
      if (body.refreshToken?.trim()) writeStoredRefreshToken(body.refreshToken.trim());
      await signInWithIssuedToken(accessToken);
      issuedAccessTokenRef.current = accessToken;
      setConfirmedAsClient(true);
      setConfirmedNextPath(CLIENT_POST_EMAIL_CONFIRM_PATH);
      setPhase("celebration");
      return true;
    },
    [signInWithIssuedToken, signOutForAccountSwitch],
  );

  const completePostConfirmSession = useCallback(
    async (body: EmailVerificationConfirmResponse): Promise<"redirected" | "premium_modal" | "success" | "failed"> => {
      if (body.premiumCheckoutToken?.trim()) {
        beginPremiumCheckoutCelebration(body.premiumCheckoutToken, body.message);
        return "success";
      }

      const nextPath = resolvePostConfirmNextPath(body, premiumCheckoutRequired);
      setConfirmedNextPath(nextPath);
      setPostLoginReturnPath(nextPath);

      let accessToken = body.accessToken?.trim() ?? "";
      if (!accessToken) {
        accessToken = (await refreshLuxuryAccessToken())?.trim() ?? "";
      }
      if (!accessToken) return "failed";

      sessionCompletionRef.current = true;
      if (body.refreshToken?.trim()) writeStoredRefreshToken(body.refreshToken.trim());

      if (isPremiumCheckoutPostConfirmPath(nextPath)) {
        setAwaitingPostConfirmCheckout(true);
      }
      setPremiumConfirmStep("celebration");
      setPhase("celebration");
      markSalonRegistrationPostSignupActive();

      await signInWithIssuedToken(accessToken);
      issuedAccessTokenRef.current = accessToken;

      return "success";
    },
    [beginPremiumCheckoutCelebration, navigate, premiumCheckoutRequired, registeredEmail, registrationAt, signInWithIssuedToken],
  );

  const broadcastConfirm = useCallback(
    (body: EmailVerificationConfirmResponse, email: string) => {
      const registrationAtForBroadcast = registrationAt || readPendingEmailVerificationAt();
      if (!registrationAtForBroadcast) return;
      notifyEmailVerifiedCrossTab({
        email,
        audience,
        registrationAt: registrationAtForBroadcast,
        message: body.message,
        accessToken: body.accessToken ?? null,
        refreshToken: body.refreshToken ?? null,
        nextPath: body.nextPath ?? null,
        premiumCheckoutToken: body.premiumCheckoutToken ?? null,
      });
    },
    [audience, registrationAt],
  );

  const confirmM = useMutation({
    mutationFn: async () => {
      return apiJson<EmailVerificationConfirmResponse>("/api/v1/auth/email-verification/confirm", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ token: tokenFromUrl.toLowerCase() }),
      });
    },
    onSuccess: (body) => {
      confirmSucceededRef.current = true;
      setConfirmErr(null);
      setConfirmMsg(body.message);
      if (tokenFromUrl) {
        cacheConfirmMessage(tokenFromUrl, body.message);
        cacheConfirmSession(tokenFromUrl, body);
      }

      const emailForBroadcast =
        registeredEmail.trim().toLowerCase() || readPendingEmailVerification();
      if (emailForBroadcast) broadcastConfirm(body, emailForBroadcast);

      if (isEmailLinkSurface) {
        setPhase("link_confirmed");
        return;
      }

      if (isClientRegistrationEmailConfirm(body, planParam, parseSalonPlanTier, readIntendedSalonPlanFromSession, audience)) {
        resumeAttemptedRef.current = true;
        void completeClientPostConfirmSession(body).then((ok) => {
          if (!ok) {
            sessionCompletionRef.current = false;
            setConfirmErr("Sessione non disponibile dopo la conferma. Accedi con email e password.");
            setPhase("error");
          }
        });
        return;
      }
      void completePostConfirmSession(body).then((result) => {
        if (result === "failed") {
          setConfirmErr("Sessione non disponibile dopo la conferma. Accedi con email e password.");
          setPhase("error");
        }
      });
    },
    onError: (e: Error) => {
      if (confirmSucceededRef.current || redirectingAfterConfirm) return;
      setConfirmMsg(null);
      setConfirmErr(e.message);
      setPhase("error");
    },
    onSettled: () => {
      releaseEmailConfirmAttempt(tokenFromUrl);
    },
  });

  const goToPremiumCheckout = useCallback(() => {
    const pendingCheckoutToken = pendingPremiumCheckoutTokenRef.current?.trim();
    if (pendingCheckoutToken) {
      setCheckoutRedirectBusy(true);
      setPremiumCheckoutError(null);
      void startPremiumRegistrationCheckout(pendingCheckoutToken).catch((err: unknown) => {
        setCheckoutRedirectBusy(false);
        setPremiumCheckoutError(err instanceof Error ? err.message : "Impossibile aprire il pagamento.");
      });
      return;
    }

    const token =
      issuedAccessTokenRef.current?.trim() ||
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(LUXURY_ACCESS_TOKEN_KEY)?.trim() : "") ||
      "";
    if (!token) {
      setPremiumCheckoutError("Sessione non disponibile. Ricarica la pagina o accedi con email e password.");
      return;
    }
    setCheckoutRedirectBusy(true);
    setPremiumCheckoutError(null);
    setPostLoginReturnPath(PREMIUM_SALON_POST_LOGIN_PATH);
    void startPremiumCheckout(token).catch((err: unknown) => {
      setCheckoutRedirectBusy(false);
      setPremiumCheckoutError(err instanceof Error ? err.message : "Impossibile aprire il pagamento.");
    });
  }, []);

  const goToClientHomeAfterCelebration = useCallback(async () => {
    setRedirectingAfterConfirm(true);
    clearPendingEmailVerification();
    clearEmailVerifiedCrossTab();

    let token =
      issuedAccessTokenRef.current?.trim() ||
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(LUXURY_ACCESS_TOKEN_KEY)?.trim() : "") ||
      "";

    if (!token) {
      token = (await refreshLuxuryAccessToken())?.trim() ?? "";
    }

    if (token) {
      sessionCompletionRef.current = true;
      await signInWithIssuedToken(token);
      issuedAccessTokenRef.current = token;
    }

    navigate(CLIENT_POST_EMAIL_CONFIRM_PATH, { replace: true });
  }, [navigate, signInWithIssuedToken]);

  const goToSalonDestinationAfterCelebration = useCallback(() => {
    clearPendingEmailVerification();
    clearSalonRegistrationPostSignupActive();
    clearIntendedSalonPlan();
    const path = postVerifyLoginPath;
    setRedirectingAfterConfirm(true);
    if (path.startsWith("http")) {
      window.location.assign(path);
      return;
    }
    navigate(path, { replace: true });
  }, [navigate, postVerifyLoginPath]);

  const goToSalonAfterPremiumPaid = useCallback(() => {
    setRedirectingAfterConfirm(true);
    const path = premiumPaidContinueTo?.trim() || SALON_OWNER_HOME_PATH;
    navigate(path, { replace: true });
  }, [navigate, premiumPaidContinueTo]);

  const awaitingPremiumCheckoutPayment =
    audience === "salon" &&
    (awaitingPremiumCheckout || awaitingPostConfirmCheckout || phase === "checkout") &&
    premiumConfirmStep === "checkout" &&
    !premiumRegistrationPaid;

  useEffect(() => {
    if (!isLuxuryNativeAppShell()) return;
    normalizeNativeDevPageHost();
  }, []);

  useEffect(() => {
    if (!listenForCrossTab || hasValidToken) return;
    const expectedEmail = registeredEmail.trim().toLowerCase() || readPendingEmailVerification();
    const at = registrationAt || readPendingEmailVerificationAt();
    if (!expectedEmail || !at) return;

    const tryResumeFromStorage = () => {
      if (crossTabHandledRef.current) return;
      const payload = readEmailVerifiedCrossTabPayload();
      if (payload) {
        void applyCrossTabPayload(payload);
      }
    };

    const tryPollFromServer = () => {
      if (crossTabHandledRef.current) return;
      void pollEmailVerificationSync(expectedEmail, at).then((body) => {
        if (!body?.message?.trim()) return;
        void applyCrossTabPayload({
          email: expectedEmail,
          audience,
          registrationAt: at,
          message: body.message,
          accessToken: body.accessToken ?? null,
          refreshToken: body.refreshToken ?? null,
          nextPath: body.nextPath ?? null,
          premiumCheckoutToken: body.premiumCheckoutToken ?? null,
          at: Date.now(),
        });
      });
    };

    tryResumeFromStorage();
    tryPollFromServer();

    const unsubscribeCrossTab = subscribeEmailVerifiedCrossTab((payload) => {
      void applyCrossTabPayload(payload);
    }, {
      expectedEmail,
      registrationAt: at,
      audience,
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        tryResumeFromStorage();
        tryPollFromServer();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tryPollFromServer);
    window.addEventListener("pageshow", () => {
      tryResumeFromStorage();
      tryPollFromServer();
    });
    const onAppResume = () => {
      tryResumeFromStorage();
      tryPollFromServer();
    };
    window.addEventListener("luxury-app-resume", onAppResume);
    const intervalId = window.setInterval(() => {
      tryResumeFromStorage();
      tryPollFromServer();
    }, 2500);

    return () => {
      unsubscribeCrossTab();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tryPollFromServer);
      window.removeEventListener("pageshow", tryResumeFromStorage);
      window.removeEventListener("luxury-app-resume", onAppResume);
      window.clearInterval(intervalId);
    };
  }, [applyCrossTabPayload, audience, hasValidToken, listenForCrossTab, registeredEmail, registrationAt]);

  useEffect(() => {
    const plan = parseSalonPlanTier(planParam);
    if (plan) setPostLoginPathForSalonRegistration(plan, premiumCheckoutRequired);
  }, [planParam, premiumCheckoutRequired]);

  useEffect(() => {
    if (awaitingPremiumCheckout && confirmMsg && !confirmErr && premiumConfirmStep === "celebration") {
      setPhase("celebration");
    }
  }, [awaitingPremiumCheckout, confirmMsg, confirmErr, premiumConfirmStep]);

  useEffect(() => {
    if (!awaitingPremiumCheckoutPayment) return;
    const expectedEmail = registeredEmail.trim().toLowerCase() || readPendingEmailVerification();
    const at = registrationAt || readPendingEmailVerificationAt();
    if (!expectedEmail || !at) return;

    const tryResumeFromStorage = () => {
      if (premiumPaidHandledRef.current) return;
      const payload = readPremiumRegistrationPaidCrossTabPayload();
      if (payload) {
        void applyPremiumPaidPayload(payload);
      }
    };

    const tryPollFromServer = () => {
      if (premiumPaidHandledRef.current) return;
      void pollEmailVerificationSync(expectedEmail, at).then((body) => {
        if (!body) return;
        tryApplyPollPaymentComplete(body);
      });
    };

    tryResumeFromStorage();
    tryPollFromServer();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        tryResumeFromStorage();
        tryPollFromServer();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", () => {
      tryResumeFromStorage();
      tryPollFromServer();
    });
    const onAppResume = () => {
      tryResumeFromStorage();
      tryPollFromServer();
    };
    window.addEventListener("luxury-app-resume", onAppResume);
    const intervalId = window.setInterval(() => {
      tryResumeFromStorage();
      tryPollFromServer();
    }, 2500);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", tryResumeFromStorage);
      window.removeEventListener("luxury-app-resume", onAppResume);
      window.clearInterval(intervalId);
    };
  }, [
    applyPremiumPaidPayload,
    awaitingPremiumCheckoutPayment,
    registeredEmail,
    registrationAt,
    tryApplyPollPaymentComplete,
  ]);

  useEffect(() => {
    if (!awaitingPremiumCheckoutPayment) return;
    const expectedEmail = registeredEmail.trim().toLowerCase() || readPendingEmailVerification();
    const at = registrationAt || readPendingEmailVerificationAt();
    if (!expectedEmail || !at) return;
    return subscribePremiumRegistrationPaidCrossTab((payload) => {
      void applyPremiumPaidPayload(payload);
    }, {
      expectedEmail,
      registrationAt: at,
      audience,
    });
  }, [
    applyPremiumPaidPayload,
    audience,
    awaitingPremiumCheckoutPayment,
    registeredEmail,
    registrationAt,
  ]);

  const confirmMutateRef = useRef(confirmM.mutate);
  confirmMutateRef.current = confirmM.mutate;

  useEffect(() => {
    if (!enabled || !hasValidToken || sessionCompletionRef.current) return;
    if (resumeAttemptedRef.current) return;

    if (hasOrphanEmailConfirmMessageCache(tokenFromUrl)) {
      clearEmailConfirmCaches(tokenFromUrl);
      setConfirmMsg(null);
    }

    const cachedSession = readCachedConfirmSession(tokenFromUrl);
    if (isEmailLinkSurface && cachedSession?.message) {
      resumeAttemptedRef.current = true;
      setConfirmMsg(cachedSession.message);
      setPhase("link_confirmed");
      return;
    }

    if (cachedSession?.premiumCheckoutToken?.trim()) {
      resumeAttemptedRef.current = true;
      if (cachedSession.message) setConfirmMsg(cachedSession.message);
      beginPremiumCheckoutCelebration(cachedSession.premiumCheckoutToken, cachedSession.message);
      return;
    }

    if (cachedSession?.accessToken?.trim()) {
      resumeAttemptedRef.current = true;
      if (cachedSession.message) setConfirmMsg(cachedSession.message);
      void completePostConfirmSession(cachedSession);
      return;
    }

    if (confirmMsg && !confirmErr) {
      const freshCached = readCachedConfirmSession(tokenFromUrl);
      if (
        freshCached &&
        isClientRegistrationEmailConfirm(
          freshCached,
          planParam,
          parseSalonPlanTier,
          readIntendedSalonPlanFromSession,
          audience,
        )
      ) {
        resumeAttemptedRef.current = true;
        if (freshCached.accessToken?.trim()) {
          void completeClientPostConfirmSession(freshCached).then((ok) => {
            if (!ok) {
              sessionCompletionRef.current = false;
              setConfirmErr("Sessione non disponibile dopo la conferma. Accedi con email e password.");
              setPhase("error");
            }
          });
        }
        return;
      }
      if (freshCached?.premiumCheckoutToken?.trim() || freshCached?.accessToken?.trim()) {
        return;
      }
      setConfirmMsg(null);
    }

    if (confirmErr || confirmM.isPending || confirmSucceededRef.current) return;
    if (!acquireEmailConfirmAttempt(tokenFromUrl)) return;

    confirmAttempted.current = true;
    setPhase("confirming");
    confirmMutateRef.current();

    return () => {
      if (!confirmSucceededRef.current && !readCachedConfirmSession(tokenFromUrl)) {
        releaseEmailConfirmAttempt(tokenFromUrl);
      }
    };
  }, [
    enabled,
    hasValidToken,
    confirmMsg,
    confirmErr,
    tokenFromUrl,
    confirmM.isPending,
    confirmedNextPath,
    planParam,
    completeClientPostConfirmSession,
    completePostConfirmSession,
    beginPremiumCheckoutCelebration,
    navigate,
    registeredEmail,
    registrationAt,
    isEmailLinkSurface,
  ]);

  return {
    phase,
    confirmMsg,
    confirmErr,
    confirmedAsClient,
    awaitingPremiumCheckout,
    awaitingPostConfirmCheckout,
    premiumConfirmStep,
    setPremiumConfirmStep,
    checkoutRedirectBusy,
    premiumCheckoutError,
    postVerifyLoginPath,
    goToPremiumCheckout,
    goToClientHomeAfterCelebration,
    goToSalonDestinationAfterCelebration,
    goToSalonAfterPremiumPaid,
    finishCelebrationHold,
    crossTabConfirmed,
    premiumRegistrationPaid,
    premiumPaidContinueTo,
    hasValidToken,
    isActive: hasValidToken || crossTabConfirmed || phase !== "idle",
  };
}
