package it.luxury.catalog.domain;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class SalonServiceRepositoryImpl implements SalonServiceRepositoryCustom {

	@PersistenceContext
	private EntityManager entityManager;

	@Override
	public List<SalonService> findPremiumCatalogRowsMatchingAnyKeyword(Collection<String> keywords) {
		List<String> needles = new ArrayList<>();
		if (keywords != null) {
			for (String raw : keywords) {
				if (raw == null || raw.isBlank()) {
					continue;
				}
				String t = raw.trim();
				if (!needles.contains(t)) {
					needles.add(t);
				}
			}
		}
		if (needles.isEmpty()) {
			return List.of();
		}
		StringBuilder jpql = new StringBuilder(
				"""
				select distinct s from SalonService s
				join fetch s.location l
				join fetch l.studioGroup g
				where upper(trim(g.planTier)) in ('PREMIUM', 'STANDARD', 'FULL')
				  and (
				""");
		for (int i = 0; i < needles.size(); i++) {
			if (i > 0) {
				jpql.append(" or ");
			}
			jpql.append("(lower(s.name) like lower(concat('%', :k").append(i).append(", '%')) ");
			jpql.append("or (s.description is not null and lower(s.description) like lower(concat('%', :k")
					.append(i)
					.append(", '%'))))");
		}
		jpql.append(")");
		TypedQuery<SalonService> query = entityManager.createQuery(jpql.toString(), SalonService.class);
		for (int i = 0; i < needles.size(); i++) {
			query.setParameter("k" + i, needles.get(i));
		}
		return query.getResultList();
	}
}
