import { apiJson } from "./client";
import {
  readRegistrationPollSecret,
  type EmailVerificationConfirmResponse,
} from "../lib/emailVerificationConfirmShared";

/** Sincronizza conferma fatta in un'altra scheda (link email) con la pagina registrazione. */
export async function pollEmailVerificationSync(
  email: string,
  registrationAt: number,
): Promise<EmailVerificationConfirmResponse | null> {
  const body = await apiJson<EmailVerificationConfirmResponse | undefined>(
    "/api/v1/auth/email-verification/poll",
    {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        registrationAt,
        pollSecret: readRegistrationPollSecret(email) ?? "",
      }),
    },
  );
  return body ?? null;
}
