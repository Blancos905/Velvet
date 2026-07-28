package it.luxury.billing.service;

import com.stripe.exception.StripeException;

/** Messaggi pagamento mostrati all'utente (senza brand del provider). */
final class BillingPaymentUserMessages {

	private BillingPaymentUserMessages() {
	}

	static String customerCreateFailed(StripeException ex) {
		String mapped = paymentConfigError(ex);
		if (mapped != null) {
			return mapped;
		}
		String code = ex.getCode() != null ? ex.getCode() : "";
		return switch (code) {
			case "email_invalid" -> "Email di fatturazione non valida. Controlla i dati in registrazione.";
			case "resource_already_exists" -> "Esiste già un account collegato a questi dati. Contatta l'assistenza.";
			default -> "Impossibile avviare il pagamento. Verifica i dati di fatturazione e riprova.";
		};
	}

	static String checkoutStartFailed(StripeException ex) {
		String mapped = paymentConfigError(ex);
		if (mapped != null) {
			return mapped;
		}
		String detail = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
		if (detail.contains("hex code")) {
			return "Configurazione pagamento non valida. Riprova tra qualche minuto.";
		}
		return "Impossibile avviare il pagamento. Riprova tra qualche minuto.";
	}

	private static String paymentConfigError(StripeException ex) {
		String code = ex.getCode() != null ? ex.getCode() : "";
		String detail = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
		if ("api_key_expired".equals(code) || detail.contains("api_key_expired")) {
			return "Pagamento non disponibile: configurazione scaduta. In locale esegui ./scripts/stripe-sandbox-setup-dev.sh e riavvia il backend, oppure contatta l'assistenza.";
		}
		if (detail.contains("invalid api key")) {
			return "Pagamento non disponibile: configurazione non valida. Contatta l'assistenza.";
		}
		return null;
	}
}
