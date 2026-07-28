package it.luxury.legal.cookie;

import it.luxury.legal.cookie.domain.CookieConsentEvent;
import it.luxury.legal.cookie.domain.CookieConsentEventRepository;
import it.luxury.security.audit.SecurityAuditService;
import it.luxury.security.auth.LuxuryUserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class CookieConsentRegistryService {

	private final CookieConsentEventRepository repository;

	public CookieConsentRegistryService(CookieConsentEventRepository repository) {
		this.repository = repository;
	}

	@Transactional
	public UUID record(
			UUID visitorId,
			UUID profileId,
			int consentVersion,
			String policyVersion,
			String action,
			boolean mapsAllowed,
			boolean editorialAllowed,
			Instant decidedAt,
			HttpServletRequest request) {
		CookieConsentEvent event = new CookieConsentEvent();
		event.setVisitorId(visitorId);
		event.setProfileId(profileId);
		event.setConsentVersion(consentVersion);
		event.setPolicyVersion(trim(policyVersion, 32));
		event.setAction(normalizeAction(action));
		event.setMapsAllowed(mapsAllowed);
		event.setEditorialAllowed(editorialAllowed);
		event.setDecidedAt(decidedAt != null ? decidedAt : Instant.now());
		if (request != null) {
			event.setIpAddress(trim(SecurityAuditService.clientIp(request), 64));
			event.setUserAgent(trim(request.getHeader("User-Agent"), 512));
		}
		return repository.save(event).getId();
	}

	public static UUID profileIdFromPrincipal(Object principal) {
		if (principal instanceof LuxuryUserPrincipal luxuryPrincipal) {
			return luxuryPrincipal.getProfileId();
		}
		return null;
	}

	private static String normalizeAction(String action) {
		if (action == null || action.isBlank()) {
			return "CUSTOM";
		}
		return action.trim().toUpperCase(Locale.ROOT).replace('-', '_');
	}

	private static String trim(String value, int max) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
	}
}
