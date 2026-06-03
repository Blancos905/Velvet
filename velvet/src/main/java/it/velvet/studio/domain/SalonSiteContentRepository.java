package it.velvet.studio.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SalonSiteContentRepository extends JpaRepository<SalonSiteContent, UUID> {

	Optional<SalonSiteContent> findBySlugAndKind(String slug, SalonSiteContentKind kind);
}
