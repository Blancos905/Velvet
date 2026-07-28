package it.luxury.studio.service;

import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.dto.MeStaffOperatorPhotoPatchRequest;
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

	public MeStaffContextService(StaffOperatorRepository staffOperatorRepository) {
		this.staffOperatorRepository = staffOperatorRepository;
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
		return MeStaffOperatorSelfDto.from(op);
	}

	@Transactional
	public MeStaffOperatorSelfDto updateOperatorPhoto(LuxuryUserPrincipal principal, MeStaffOperatorPhotoPatchRequest body) {
		StaffOperator op = requireLinkedOperator(principal);
		String photoDataUrl = body == null ? null : safe(body.photoDataUrl(), 12_000_000);
		String normalizedPhoto = (photoDataUrl == null || photoDataUrl.isBlank()) ? null : photoDataUrl;
		op.updateProfile(op.getFirstName(), op.getLastName(), op.getRole(), normalizedPhoto);
		try {
			op = staffOperatorRepository.save(op);
		} catch (DataIntegrityViolationException ex) {
			op.updateProfile(op.getFirstName(), op.getLastName(), op.getRole(), null);
			op = staffOperatorRepository.save(op);
		}
		return MeStaffOperatorSelfDto.from(op);
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
