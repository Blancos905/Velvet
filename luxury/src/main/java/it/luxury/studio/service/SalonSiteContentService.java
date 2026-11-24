package it.luxury.studio.service;

import it.luxury.common.api.BusinessException;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.SalonSiteContent;
import it.luxury.studio.domain.SalonSiteContentKind;
import it.luxury.studio.domain.SalonSiteContentRepository;
import it.luxury.studio.domain.StudioGroup;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Persistenza lato server della vetrina/sito salone (sostituisce lo storage solo-browser): scrittura riservata
 * al titolare della sede, lettura pubblica per la pagina vetrina visibile anche nell'app.
 */
@Service
public class SalonSiteContentService {

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final LocationRepository locationRepository;
	private final SalonSiteContentRepository salonSiteContentRepository;

	public SalonSiteContentService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			LocationRepository locationRepository,
			SalonSiteContentRepository salonSiteContentRepository) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.locationRepository = locationRepository;
		this.salonSiteContentRepository = salonSiteContentRepository;
	}

	/** Lettura pubblica: vuoto se la sede non ha ancora salvato contenuto, o se non è visibile ai clienti. */
	@Transactional(readOnly = true)
	public Optional<SalonSiteContent> readPublic(String slug, SalonSiteContentKind kind) {
		String normalizedSlug = normalizeSlug(slug);
		Optional<Location> location = locationRepository.findBySlug(normalizedSlug);
		if (location.isPresent() && !location.get().isVisibleToClients()) {
			return Optional.empty();
		}
		return salonSiteContentRepository.findBySlugAndKind(normalizedSlug, kind);
	}

	/** Lettura titolare: la vetrina resta disponibile in anteprima anche se i clienti non la vedono. */
	@Transactional(readOnly = true)
	public Optional<SalonSiteContent> readForOwner(
			LuxuryUserPrincipal principal, String slug, SalonSiteContentKind kind) {
		String normalizedSlug = normalizeSlug(slug);
		assertOwnerLocation(principal, normalizedSlug);
		return salonSiteContentRepository.findBySlugAndKind(normalizedSlug, kind);
	}

	/** Upsert riservato al titolare proprietario della sede con questo slug. */
	@Transactional
	public SalonSiteContent upsertForOwner(
			LuxuryUserPrincipal principal, String slug, SalonSiteContentKind kind, String payload) {
		String normalizedSlug = normalizeSlug(slug);
		assertOwnerLocation(principal, normalizedSlug);
		SalonSiteContent content = salonSiteContentRepository.findBySlugAndKind(normalizedSlug, kind)
				.map(existing -> {
					existing.updatePayload(payload);
					return existing;
				})
				.orElseGet(() -> new SalonSiteContent(normalizedSlug, kind, payload));
		return salonSiteContentRepository.save(content);
	}

	private void assertOwnerLocation(LuxuryUserPrincipal principal, String normalizedSlug) {
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(
						HttpStatus.NOT_FOUND,
						"SALON_NOT_PROVISIONED",
						"Nessun salone collegato a questo account. Completa la registrazione titolare."));
		Location location = locationRepository.findBySlug(normalizedSlug)
				.orElseThrow(() -> new BusinessException(
						HttpStatus.NOT_FOUND,
						"NOT_FOUND",
						"Sede non trovata per lo slug indicato."));
		if (location.getStudioGroup() == null || !location.getStudioGroup().getId().equals(group.getId())) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"FORBIDDEN",
					"Questa sede non appartiene al tuo account.");
		}
	}

	private static String normalizeSlug(String slug) {
		String value = slug == null ? "" : slug.trim().toLowerCase();
		if (value.isEmpty()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Slug sede mancante.");
		}
		return value;
	}
}
