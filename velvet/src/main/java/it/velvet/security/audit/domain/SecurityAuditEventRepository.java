package it.velvet.security.audit.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface SecurityAuditEventRepository extends JpaRepository<SecurityAuditEvent, UUID> {

	@Modifying
	@Query("delete from SecurityAuditEvent e where e.createdAt < :cutoff")
	int deleteByCreatedAtBefore(@Param("cutoff") Instant cutoff);
}
