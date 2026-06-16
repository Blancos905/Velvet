package it.velvet.notification.service;

import java.util.Locale;
import java.util.Set;

/**
 * Evita tentativi SMTP verso indirizzi di seed/test e classifica i rifiuti destinatario
 * (dominio inesistente, mailbox invalida) come non bloccanti per il resto del sistema.
 */
final class TransactionalEmailDeliverability {

	private static final Set<String> SKIP_DOMAINS = Set.of(
			"test.com",
			"example.com",
			"example.org",
			"example.net",
			"invalid",
			"localhost");

	private TransactionalEmailDeliverability() {
	}

	static boolean shouldSkipBeforeSmtp(String normalizedEmail) {
		String domain = domainPart(normalizedEmail);
		return domain != null && SKIP_DOMAINS.contains(domain);
	}

	static boolean isRecipientRejection(Throwable ex) {
		Throwable current = ex;
		while (current != null) {
			String message = current.getMessage();
			if (message != null) {
				String lower = message.toLowerCase(Locale.ROOT);
				if (lower.contains("invalid addresses")
						|| lower.contains("invalid destination domain")
						|| lower.contains("smtpaddressfailedexception")
						|| lower.contains("mailbox unavailable")
						|| lower.contains("user unknown")
						|| lower.contains("recipient address rejected")
						|| lower.contains("dominio non valido")) {
					return true;
				}
			}
			String simpleName = current.getClass().getSimpleName();
			if ("SendFailedException".equals(simpleName) || "SMTPAddressFailedException".equals(simpleName)) {
				return true;
			}
			current = current.getCause();
		}
		return false;
	}

	private static String domainPart(String normalizedEmail) {
		if (normalizedEmail == null || normalizedEmail.isBlank()) {
			return null;
		}
		int at = normalizedEmail.lastIndexOf('@');
		if (at < 0 || at == normalizedEmail.length() - 1) {
			return null;
		}
		return normalizedEmail.substring(at + 1);
	}
}
