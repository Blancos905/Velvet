package it.luxury.studio.service;

import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.dto.MeStaffOperatorSelfPatchRequest;
import it.luxury.studio.dto.MeStaffOperatorSelfDto;
import it.luxury.studio.dto.MeStaffSalonDto;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class MeStaffContextService {

	private final StaffOperatorRepository staffOperatorRepository;
	private final ReviewRepository reviewRepository;

	public MeStaffContextService(
			StaffOperatorRepository staffOperatorRepository,
			ReviewRepository reviewRepository) {
		this.staffOperatorRepository = staffOperatorRepository;
		this.reviewRepository = reviewRepository;
	}

	@Transactional(readOnly = true)
	public MeStaffSalonDto resolveSalonForStaff(LuxuryUserPrincipal principal) {
		return resolveLinkedOperator(principal)
				.map(op -> {
					Location loc = op.getLocation();
					StudioGroup g = loc.getStudioGroup();
					String salonDisplayName = firstNonBlank(
							g.getName(),
							loc.getName(),
							humanizeSlug(loc.getSlug()),
							"Salone");
					return new MeStaffSalonDto(
							salonDisplayName,
							op.getId(),
							loc.getId(),
							StudioGroup.canonicalPlanTier(g.getPlanTier()));
				})
				.orElse(new MeStaffSalonDto(null, null, null, null));
	}

	@Transactional(readOnly = true)
	public MeStaffOperatorSelfDto getOperatorSelf(LuxuryUserPrincipal principal) {
		StaffOperator op = requireLinkedOperator(principal);
		return toSelfDto(op);
	}

	@Transactional
	public MeStaffOperatorSelfDto updateOperatorSelf(LuxuryUserPrincipal principal, MeStaffOperatorSelfPatchRequest body) {
		StaffOperator op = requireLinkedOperator(principal);
		if (body != null && body.requireBookingConfirmation() != null) {
			op.setRequireBookingConfirmation(body.requireBookingConfirmation());
		}
		if (body != null && body.photoDataUrl() != null) {
			String photoDataUrl = safe(body.photoDataUrl(), 12_000_000);
			String normalizedPhoto = photoDataUrl.isBlank() ? null : photoDataUrl;
			op.updateProfile(op.getFirstName(), op.getLastName(), op.getRole(), normalizedPhoto);
			try {
				op = staffOperatorRepository.save(op);
			} catch (DataIntegrityViolationException ex) {
				op.updateProfile(op.getFirstName(), op.getLastName(), op.getRole(), null);
				op = staffOperatorRepository.save(op);
			}
			return toSelfDto(op);
		}
		op = staffOperatorRepository.save(op);
		return toSelfDto(op);
	}

	private MeStaffOperatorSelfDto toSelfDto(StaffOperator op) {
		Object[] agg = firstAggRow(reviewRepository.summarizeStaffRatingForOperator(op.getId()));
		Double avg = null;
		Long count = null;
		if (agg != null && agg.length >= 2 && agg[1] instanceof Number countNum) {
			long c = countNum.longValue();
			if (c > 0 && agg[0] instanceof Number avgNum) {
				count = c;
				avg = Math.round(avgNum.doubleValue() * 10.0) / 10.0;
			}
		}
		return MeStaffOperatorSelfDto.from(op, avg, count);
	}

	private static Object[] firstAggRow(java.util.List<Object[]> rows) {
		if (rows == null || rows.isEmpty()) {
			return null;
		}
		return rows.get(0);
	}

	private Optional<StaffOperator> resolveLinkedOperator(LuxuryUserPrincipal principal) {
		if (principal == null) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Non autenticato.");
		}
		if (principal.getProfileId() == null
				&& (principal.getSubject() == null || principal.getSubject().isBlank())) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Token senza profilo utente.");
		}
		// Stesso legame operatore ↔ profilo di {@link MeStaffAgendaService}, con fallback su auth_sub se uid ≠ FK.
		return staffOperatorRepository.resolveLinkedOperatorId(
				principal.getProfileId(),
				principal.getSubject() != null ? principal.getSubject() : "");
	}

	private StaffOperator requireLinkedOperator(LuxuryUserPrincipal principal) {
		return resolveLinkedOperator(principal)
				.orElseThrow(() -> new BusinessException(
						HttpStatus.NOT_FOUND,
						"STAFF_OPERATOR_NOT_LINKED",
						"Nessun profilo operatore collegato a questo account."));
	}

	private static String safe(String v, int maxLen) {
		if (v == null) return "";
		String t = v.trim();
		return t.length() > maxLen ? t.substring(0, maxLen) : t;
	}

	private static String firstNonBlank(String... parts) {
		if (parts == null) {
			return "Salone";
		}
		for (String p : parts) {
			if (p != null && !p.isBlank()) {
				return p.trim();
			}
		}
		return "Salone";
	}

	private static String humanizeSlug(String slug) {
		if (slug == null || slug.isBlank()) {
			return null;
		}
		String s = slug.replace('-', ' ').trim();
		return s.isEmpty() ? null : s;
	}
}
