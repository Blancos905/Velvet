package it.velvet.admin.service;

import it.velvet.admin.domain.PlatformSuperAdminCredential;
import it.velvet.admin.domain.PlatformSuperAdminCredentialRepository;
import it.velvet.bootstrap.SuperAdminConsumerBootstrap;
import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class SuperAdminMeProfileService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository;

	public SuperAdminMeProfileService(
			ConsumerProfileRepository consumerProfileRepository,
			PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.platformSuperAdminCredentialRepository = platformSuperAdminCredentialRepository;
	}

	public SuperAdminMeProfileDto resolve(VelvetUserPrincipal principal) {
		Optional<ConsumerProfile> row = resolveConsumerRow(principal);
		if (row.isEmpty()) {
			return SuperAdminMeProfileDto.fromJwtFallback(principal.getEmail());
		}
		ConsumerProfile p = row.get();
		return SuperAdminMeProfileDto.fromProfile(p);
	}

	@Transactional
	public SuperAdminMeProfileDto patch(VelvetUserPrincipal principal, SuperAdminMeProfilePatchRequest body) {
		boolean any =
				body.displayName() != null || body.phone() != null || body.preferredLocale() != null;
		if (!any) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Nessun campo da aggiornare.");
		}
		ConsumerProfile p = resolveConsumerRowForWrite(principal)
				.orElseThrow(() -> new BusinessException(
						HttpStatus.CONFLICT,
						"SUPER_ADMIN_PROFILE_NOT_PERSISTED",
						"Profilo consumer del super admin non trovato: impossibile salvare. Verifica il bootstrap (credenziali DB o proprietà)."));
		if (body.displayName() != null) {
			String v = body.displayName().trim();
			p.setDisplayName(v.isEmpty() ? null : v);
		}
		if (body.phone() != null) {
			String v = body.phone().trim();
			p.setPhone(v.isEmpty() ? null : v);
		}
		if (body.preferredLocale() != null) {
			String v = body.preferredLocale().trim();
			p.setPreferredLocale(v.isEmpty() ? null : v);
		}
		consumerProfileRepository.save(p);
		return SuperAdminMeProfileDto.fromProfile(p);
	}

	/**
	 * Scrittura anagrafica super admin: per sessione {@code velvet-super-admin} usa solo il record con
	 * {@link SuperAdminConsumerBootstrap#SUPER_ADMIN_KEYCLOAK_SUB}, allineato a {@code GET /api/v1/me/support}.
	 */
	private Optional<ConsumerProfile> resolveConsumerRowForWrite(VelvetUserPrincipal principal) {
		if (VelvetSuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT.equals(principal.getSubject())) {
			return consumerProfileRepository.findByKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB);
		}
		return resolveConsumerRow(principal);
	}

	private Optional<ConsumerProfile> resolveConsumerRow(VelvetUserPrincipal principal) {
		if (VelvetSuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT.equals(principal.getSubject())) {
			Optional<ConsumerProfile> bySub = consumerProfileRepository.findByKeycloakSub(
					SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB);
			if (bySub.isPresent()) {
				return bySub;
			}
			// Login con username senza @ → JWT email sintetica *@velvet.superadmin: risolve l'email reale dalla credenziale DB.
			Optional<PlatformSuperAdminCredential> credOpt =
					platformSuperAdminCredentialRepository.findById(PlatformSuperAdminCredential.SINGLETON_ID);
			if (credOpt.isPresent()) {
				String credEmail = normalizeEmail(credOpt.get().getUsername());
				if (credEmail != null) {
					Optional<ConsumerProfile> byCredEmail = consumerProfileRepository.findByEmailIgnoreCase(credEmail);
					if (byCredEmail.isPresent()) {
						return byCredEmail;
					}
				}
			}
			String em = normalizeEmail(principal.getEmail());
			if (em != null && !em.endsWith("@velvet.superadmin")) {
				return consumerProfileRepository.findByEmailIgnoreCase(em);
			}
			return Optional.empty();
		}
		UUID id = principal.getProfileId();
		if (id != null) {
			return consumerProfileRepository.findById(id);
		}
		String em = normalizeEmail(principal.getEmail());
		if (em != null) {
			return consumerProfileRepository.findByEmailIgnoreCase(em);
		}
		return Optional.empty();
	}

	private static String normalizeEmail(String email) {
		if (email == null || email.isBlank()) {
			return null;
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	public record SuperAdminMeProfileDto(
			UUID profileId,
			String email,
			String displayName,
			String phone,
			String preferredLocale,
			String securityRoles,
			boolean persistedProfile) {

		static SuperAdminMeProfileDto fromProfile(ConsumerProfile p) {
			String rolesLabel = SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB.equals(p.getKeycloakSub())
					? "SUPER ADMIN"
					: p.getSecurityRoles();
			return new SuperAdminMeProfileDto(
					p.getId(),
					p.getEmail(),
					p.getDisplayName(),
					p.getPhone(),
					p.getPreferredLocale(),
					rolesLabel,
					true);
		}

		static SuperAdminMeProfileDto fromJwtFallback(String emailRaw) {
			String em = emailRaw != null ? emailRaw.trim() : "";
			if (em.isEmpty()) {
				return new SuperAdminMeProfileDto(null, null, null, null, null, "SUPER ADMIN", false);
			}
			String display = null;
			int at = em.indexOf('@');
			if (at > 0 && !em.endsWith("@velvet.superadmin")) {
				display = em.substring(0, at);
			}
			return new SuperAdminMeProfileDto(null, em, display, null, null, "SUPER ADMIN", false);
		}
	}

	/** Corpo {@code PATCH /api/v1/admin/overview}: valori {@code null} = non modificare il campo. */
	public record SuperAdminMeProfilePatchRequest(
			@Size(max = 200) String displayName,
			@Size(max = 40) String phone,
			@Size(max = 16) String preferredLocale) {
	}
}
