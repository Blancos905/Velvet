package it.luxury.security.audit;

import it.luxury.security.audit.domain.SecurityAuditEvent;
import it.luxury.security.audit.domain.SecurityAuditEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SecurityAuditService {

	private final SecurityAuditEventRepository repository;

	public SecurityAuditService(SecurityAuditEventRepository repository) {
		this.repository = repository;
	}

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void record(String eventType, String outcome, String subjectId, UUID profileId, HttpServletRequest request, String details) {
		SecurityAuditEvent e = new SecurityAuditEvent();
		e.setEventType(truncate(eventType, 64));
		e.setOutcome(truncate(outcome, 16));
		e.setSubjectId(truncate(subjectId, 256));
		e.setProfileId(profileId);
		e.setDetails(truncate(details, 1024));
		if (request != null) {
			e.setIpAddress(truncate(clientIp(request), 64));
			e.setUserAgent(truncate(request.getHeader("User-Agent"), 512));
		}
		repository.save(e);
	}

	public static String clientIp(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			int comma = forwarded.indexOf(',');
			return (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
		}
		return request.getRemoteAddr();
	}

	private static String truncate(String value, int max) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
	}
}
