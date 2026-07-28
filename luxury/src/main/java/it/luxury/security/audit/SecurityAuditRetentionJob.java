package it.luxury.security.audit;

import it.luxury.config.LuxuryLoggingProperties;
import it.luxury.security.audit.domain.SecurityAuditEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class SecurityAuditRetentionJob {

	private static final Logger log = LoggerFactory.getLogger(SecurityAuditRetentionJob.class);

	private final SecurityAuditEventRepository securityAuditEventRepository;
	private final LuxuryLoggingProperties loggingProperties;

	public SecurityAuditRetentionJob(
			SecurityAuditEventRepository securityAuditEventRepository,
			LuxuryLoggingProperties loggingProperties) {
		this.securityAuditEventRepository = securityAuditEventRepository;
		this.loggingProperties = loggingProperties;
	}

	@Scheduled(cron = "${luxury.logging.retention-cron:0 30 4 * * *}")
	@Transactional
	public void purgeExpiredAuditEvents() {
		int retentionDays = loggingProperties.getRetentionDays();
		if (retentionDays <= 0) {
			return;
		}
		Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
		int removed = securityAuditEventRepository.deleteByCreatedAtBefore(cutoff);
		if (removed > 0) {
			log.info("Retention log sicurezza: eliminati {} eventi anteriori a {} giorni.", removed, retentionDays);
		}
	}
}
