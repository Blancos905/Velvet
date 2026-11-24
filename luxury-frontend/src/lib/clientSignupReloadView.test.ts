import { describe, expect, it } from "vitest";
import {
  resolveClientSignupReloadView,
  shouldResumeSalonRegistrationEmailConfirm,
} from "./emailVerificationConfirmShared";

describe("resolveClientSignupReloadView", () => {
  it("senza registrazione cliente in corso torna al modulo", () => {
    expect(resolveClientSignupReloadView({ awaiting: null, verified: null })).toBe("form");
  });

  it("prima della conferma resta su controlla email", () => {
    expect(
      resolveClientSignupReloadView({
        awaiting: { email: "cliente@example.com", at: 10 },
        verified: null,
      }),
    ).toBe("check-email");
  });

  it("dopo la conferma resta sul ringraziamento", () => {
    expect(
      resolveClientSignupReloadView({
        awaiting: { email: "cliente@example.com", at: 10 },
        verified: { email: "cliente@example.com", audience: "client", registrationAt: 10 },
      }),
    ).toBe("thank-you");
  });

  it("il cliente loggato che diventa partner vede i piani, non la conferma email del cliente", () => {
    expect(
      shouldResumeSalonRegistrationEmailConfirm({
        registrationComplete: false,
        salonPostSignupActive: true,
        nativeApp: false,
        pendingEmail: "",
        clientAwaitingEmail: "",
      }),
    ).toBe(false);
    expect(
      shouldResumeSalonRegistrationEmailConfirm({
        registrationComplete: false,
        salonPostSignupActive: true,
        nativeApp: true,
        pendingEmail: "cliente@example.com",
        clientAwaitingEmail: "cliente@example.com",
      }),
    ).toBe(false);
  });

  it("dopo l'invio della registrazione salone resta la conferma email", () => {
    expect(
      shouldResumeSalonRegistrationEmailConfirm({
        registrationComplete: true,
        salonPostSignupActive: false,
        nativeApp: false,
        pendingEmail: "salone@example.com",
        clientAwaitingEmail: "salone@example.com",
      }),
    ).toBe(true);
    expect(
      shouldResumeSalonRegistrationEmailConfirm({
        registrationComplete: false,
        salonPostSignupActive: true,
        nativeApp: false,
        pendingEmail: "salone@example.com",
        clientAwaitingEmail: "",
      }),
    ).toBe(true);
  });

  it("una conferma di un'altra registrazione non salta al ringraziamento", () => {
    expect(
      resolveClientSignupReloadView({
        awaiting: { email: "cliente@example.com", at: 10 },
        verified: { email: "altro@example.com", audience: "client", registrationAt: 10 },
      }),
    ).toBe("check-email");
  });
});
