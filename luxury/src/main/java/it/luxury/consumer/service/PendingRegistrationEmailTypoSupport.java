package it.luxury.consumer.service;

import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.domain.PendingRegistrationRepository;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/** Recupera pending con typo dominio o local-part simile al reinvio email. */
final class PendingRegistrationEmailTypoSupport {

	private static final Map<String, List<String>> DOMAIN_TYPOS = Map.of(
			"gmail.com", List.of("gamil.com", "gmial.com", "gmai.com", "gnail.com", "gmail.con", "gmail.co"),
			"outlook.com", List.of("outlok.com", "outlook.con"),
			"hotmail.com", List.of("hotmial.com", "hotmal.com"),
			"icloud.com", List.of("iclould.com", "icloud.con"));

	private PendingRegistrationEmailTypoSupport() {
	}

	static Optional<PendingRegistration> findTypoMatch(PendingRegistrationRepository repository, String correctedEmail) {
		if (correctedEmail == null || correctedEmail.isBlank()) {
			return Optional.empty();
		}
		String norm = correctedEmail.trim().toLowerCase(Locale.ROOT);
		int at = norm.indexOf('@');
		if (at <= 0 || at == norm.length() - 1) {
			return Optional.empty();
		}
		String local = norm.substring(0, at);
		String domain = norm.substring(at + 1);
		List<String> typoDomains = DOMAIN_TYPOS.get(domain);
		if (typoDomains == null || typoDomains.isEmpty()) {
			return Optional.empty();
		}
		for (String typoDomain : typoDomains) {
			Optional<PendingRegistration> found = repository.findByEmailIgnoreCase(local + "@" + typoDomain);
			if (found.isPresent()) {
				return found;
			}
		}
		return Optional.empty();
	}

	static Optional<PendingRegistration> findSimilarLocalPart(PendingRegistrationRepository repository, String correctedEmail) {
		EmailParts requested = parseEmail(correctedEmail);
		if (requested == null) {
			return Optional.empty();
		}
		List<PendingRegistration> sameDomain =
				repository.findByEmailDomainIgnoreCase(requested.domain());
		if (sameDomain.isEmpty()) {
			return Optional.empty();
		}
		PendingRegistration best = null;
		int bestDistance = Integer.MAX_VALUE;
		for (PendingRegistration candidate : sameDomain) {
			EmailParts existing = parseEmail(candidate.getEmail());
			if (existing == null) {
				continue;
			}
			int distance = levenshtein(existing.local(), requested.local());
			if (distance > 0 && distance <= 2 && distance < bestDistance) {
				bestDistance = distance;
				best = candidate;
			}
		}
		return Optional.ofNullable(best);
	}

	private static EmailParts parseEmail(String email) {
		if (email == null || email.isBlank()) {
			return null;
		}
		String norm = email.trim().toLowerCase(Locale.ROOT);
		int at = norm.indexOf('@');
		if (at <= 0 || at == norm.length() - 1) {
			return null;
		}
		return new EmailParts(norm.substring(0, at), norm.substring(at + 1));
	}

	private static int levenshtein(String a, String b) {
		int[][] dp = new int[a.length() + 1][b.length() + 1];
		for (int i = 0; i <= a.length(); i++) {
			dp[i][0] = i;
		}
		for (int j = 0; j <= b.length(); j++) {
			dp[0][j] = j;
		}
		for (int i = 1; i <= a.length(); i++) {
			for (int j = 1; j <= b.length(); j++) {
				int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
				dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
			}
		}
		return dp[a.length()][b.length()];
	}

	private record EmailParts(String local, String domain) {
	}
}
