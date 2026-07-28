package it.luxury.review.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface PlatformReviewRepository extends JpaRepository<PlatformReview, UUID> {

	@Query("select avg(p.rating) from PlatformReview p")
	Optional<Double> averageRating();

	long countByCreatedAtGreaterThanEqual(java.time.Instant createdAt);

	Page<PlatformReview> findAllByOrderByCreatedAtDesc(Pageable pageable);

	@EntityGraph(attributePaths = { "consumerProfile", "studioGroup" })
	@Query("select p from PlatformReview p")
	Page<PlatformReview> findPageWithAuthors(Pageable pageable);
}
