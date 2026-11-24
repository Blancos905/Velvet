package it.luxury.sponsor.service;

import it.luxury.common.api.BusinessException;
import it.luxury.sponsor.PlacementSponsorSlots;
import it.luxury.sponsor.api.PlacementSponsorView;
import it.luxury.sponsor.api.PlacementSponsorWrite;
import it.luxury.sponsor.domain.PlacementSponsor;
import it.luxury.sponsor.domain.PlacementSponsorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class PlacementSponsorService {

	private static final int MAX_IMAGE_CHARS = 400_000;

	private final PlacementSponsorRepository repository;

	public PlacementSponsorService(PlacementSponsorRepository repository) {
		this.repository = repository;
	}

	/** Sponsor attivi del posto, nell'ordine del carousel (massimo 5 in agenda). */
	@Transactional(readOnly = true)
	public List<PlacementSponsorView> listPublic(String placement) {
		if (!PlacementSponsorSlots.isKnown(placement)) {
			return List.of();
		}
		return listAdmin(placement).stream()
				.filter(PlacementSponsorView::active)
				.limit(PlacementSponsorSlots.AGENDA_CAROUSEL_SIZE)
				.toList();
	}

	@Transactional(readOnly = true)
	public List<PlacementSponsorView> listAdmin(String placement) {
		requireKnown(placement);
		return repository.findByPlacementOrderBySortOrderAscCreatedAtAsc(placement).stream()
				.sorted(Comparator.comparingInt(PlacementSponsor::getSortOrder)
						.thenComparing(PlacementSponsor::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
				.map(PlacementSponsorView::from)
				.toList();
	}

	@Transactional
	public PlacementSponsorView create(PlacementSponsorWrite write) {
		PlacementSponsor row = new PlacementSponsor();
		row.setId(UUID.randomUUID());
		row.setCreatedAt(Instant.now());
		apply(row, write, true);
		if (write.sortOrder() == null) {
			int next = repository.findByPlacementOrderBySortOrderAscCreatedAtAsc(row.getPlacement()).stream()
					.mapToInt(PlacementSponsor::getSortOrder)
					.max()
					.orElse(-1) + 1;
			row.setSortOrder(next);
		}
		return PlacementSponsorView.from(repository.save(row));
	}

	@Transactional
	public PlacementSponsorView update(UUID id, PlacementSponsorWrite write) {
		PlacementSponsor row = repository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "sponsor_not_found", "Sponsor non trovato."));
		apply(row, write, false);
		return PlacementSponsorView.from(repository.save(row));
	}

	@Transactional
	public void delete(UUID id) {
		if (!repository.existsById(id)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "sponsor_not_found", "Sponsor non trovato.");
		}
		repository.deleteById(id);
	}

	/** Cinque marchi di prova solo se l'agenda non ha ancora sponsor impostati. */
	@Transactional
	public void seedAgendaIfEmpty() {
		if (repository.countByPlacement(PlacementSponsorSlots.CLIENT_BOOKINGS) > 0) {
			return;
		}
		List<PlacementSponsorWrite> demos = agendaDemos();
		for (int i = 0; i < demos.size(); i++) {
			PlacementSponsorWrite demo = demos.get(i);
			PlacementSponsor row = new PlacementSponsor();
			row.setId(UUID.randomUUID());
			row.setCreatedAt(Instant.now().plusMillis(i));
			apply(row, demo, true);
			row.setSortOrder(i);
			repository.save(row);
		}
	}

	static List<PlacementSponsorWrite> agendaDemos() {
		List<PlacementSponsorWrite> demos = new ArrayList<>();
		demos.add(demo("Noir Silk", "After-care per i capelli tra una visita e l’altra", "Scopri",
				"https://example.com/ads/noir-silk", "/ads/demo-client-noir-silk.svg", 0));
		demos.add(demo("Velvet Bloom", "Fiori e gloss per il tuo after-care", "Scopri",
				"https://example.com/ads/velvet-bloom", "/ads/demo-client-velvet-bloom.svg", 1));
		demos.add(demo("Aqua Mirage", "Idratazione che si nota", "Prova",
				"https://example.com/ads/aqua-mirage", "/ads/demo-client-aqua-mirage.svg", 2));
		demos.add(demo("Amber Brush", "Pennelli che non tradiscono il colore", "Scopri",
				"https://example.com/ads/amber-brush", "/ads/demo-staff-amber-brush.svg", 3));
		demos.add(demo("Echo Scent", "Una firma leggera tra un appuntamento e l’altro", "Prova",
				"https://example.com/ads/echo-scent", "/ads/demo-staff-echo-scent.svg", 4));
		return List.copyOf(demos);
	}

	private static PlacementSponsorWrite demo(
			String brand, String headline, String cta, String href, String image, int order) {
		return new PlacementSponsorWrite(
				PlacementSponsorSlots.CLIENT_BOOKINGS, brand, headline, cta, href, image, order, true);
	}

	private void apply(PlacementSponsor row, PlacementSponsorWrite write, boolean creating) {
		String placement = trim(write.placement());
		if (placement == null) {
			placement = creating ? null : row.getPlacement();
		}
		requireKnown(placement);
		String brand = required(write.brandName(), 80, "brand_name");
		String headline = required(write.headline(), 160, "headline");
		String cta = required(write.ctaLabel(), 40, "cta_label");
		String href = required(write.href(), 500, "href");
		if (!href.startsWith("https://") && !href.startsWith("http://") && !href.startsWith("/")) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "sponsor_href", "Il link deve iniziare con http://, https:// o /.");
		}
		String image = required(write.imageSrc(), MAX_IMAGE_CHARS, "image_src");
		if (!image.startsWith("/") && !image.startsWith("https://") && !image.startsWith("data:image/")) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST, "sponsor_image", "L’immagine deve essere un percorso, un URL https o un file immagine.");
		}
		row.setPlacement(placement);
		row.setBrandName(brand);
		row.setHeadline(headline);
		row.setCtaLabel(cta);
		row.setHref(href);
		row.setImageSrc(image);
		if (write.sortOrder() != null) {
			row.setSortOrder(Math.max(0, write.sortOrder()));
		}
		if (write.active() != null) {
			row.setActive(write.active());
		}
		else if (creating) {
			row.setActive(true);
		}
		if (row.getCreatedAt() == null) {
			row.setCreatedAt(Instant.now());
		}
	}

	private static void requireKnown(String placement) {
		if (!PlacementSponsorSlots.isKnown(placement)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "sponsor_placement", "Posto sponsor non riconosciuto.");
		}
	}

	private static String required(String value, int max, String code) {
		String trimmed = trim(value);
		if (trimmed == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "sponsor_" + code, "Campo obbligatorio.");
		}
		if (trimmed.length() > max) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "sponsor_" + code, "Testo troppo lungo.");
		}
		return trimmed;
	}

	private static String trim(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}
}
