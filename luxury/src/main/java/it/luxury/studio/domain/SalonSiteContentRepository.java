package it.luxury.studio.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalonSiteContentRepository extends JpaRepository<SalonSiteContent, UUID> {

	Optional<SalonSiteContent> findBySlugAndKind(String slug, SalonSiteContentKind kind);

	List<SalonSiteContent> findBySlugInAndKind(Collection<String> slugs, SalonSiteContentKind kind);

	@Query("select sc.slug, max(sc.updatedAt) from SalonSiteContent sc group by sc.slug")
	List<Object[]> findMaxUpdatedAtGroupedBySlug();
}
