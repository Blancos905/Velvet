package it.velvet.consumer.service;

import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Il ruolo applicativo {@code OWNER} deve coincidere con una registrazione salone in directory:
 * {@code studio_groups.owner_email} uguale all'email del profilo e, se valorizzato,
 * {@code owner_keycloak_sub} uguale al {@code keycloak_sub} del profilo.
 * Se il titolare risulta valido, il profilo non conserva {@code CLIENT} (vedi {@link SalonOwnerProfileRoles}).
 */
@Service
public class SalonOwnerRoleAlignmentService {

	private final StudioGroupRepository studioGroupRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final StaffOperatorRepository staffOperatorRepository;

	public SalonOwnerRoleAlignmentService(
			StudioGroupRepository studioGroupRepository,
			ConsumerProfileRepository consumerProfileRepository,
			StaffOperatorRepository staffOperatorRepository) {
		this.studioGroupRepository = studioGroupRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.staffOperatorRepository = staffOperatorRepository;
	}

	/**
	 * Dopo autenticazione password riuscita: rimuove {@code OWNER} orfano o lo aggiunge se il titolare risulta in directory.
	 */
	@Transactional
	public void alignAfterSuccessfulPasswordLogin(ConsumerProfile profile) {
		// Account collegato a un operatore in sede: non applicare mai la logica titolare/cliente (evita STAFF → CLIENT).
		// Ripara profili incoerenti (es. solo CLIENT): senza ROLE_STAFF il JWT non passa @PreAuthorize su /me/salon/notifications.
		if (profile.getId() != null && staffOperatorRepository.findByConsumerProfile_Id(profile.getId()).isPresent()) {
			persistIfRolesChanged(profile, ensureStaffRoleForLinkedOperator(profile.getSecurityRoles()));
			return;
		}
		if (VelvetUserPrincipal.parseRoleStrings(profile.getSecurityRoles()).contains("STAFF")) {
			return;
		}
		String email = profile.getEmail();
		if (email == null || email.isBlank()) {
			persistIfRolesChanged(profile, withoutOwner(profile.getSecurityRoles()));
			return;
		}
		String normEmail = email.trim().toLowerCase(Locale.ROOT);
		Optional<StudioGroup> groupOpt = studioGroupRepository.findByOwnerEmailIgnoreCase(normEmail);
		if (groupOpt.isEmpty()) {
			persistIfRolesChanged(profile, withoutOwner(profile.getSecurityRoles()));
			return;
		}
		StudioGroup group = groupOpt.get();
		String pSub = profile.getKeycloakSub();
		String gSub = group.getOwnerKeycloakSub();
		if (gSub != null && !gSub.isBlank() && pSub != null && !gSub.equalsIgnoreCase(pSub)) {
			persistIfRolesChanged(profile, withoutOwner(profile.getSecurityRoles()));
			return;
		}
		boolean groupTouched = group.assignOwnerKeycloakSubIfUnset(pSub);
		if (groupTouched) {
			studioGroupRepository.save(group);
		}
		persistIfRolesChanged(profile, SalonOwnerProfileRoles.applySalonDirectoryTitolare(profile.getSecurityRoles()));
	}

	private void persistIfRolesChanged(ConsumerProfile profile, String newRoles) {
		String before = profile.getSecurityRoles();
		if (before == null ? newRoles != null : !before.equals(newRoles)) {
			profile.setSecurityRoles(newRoles);
			consumerProfileRepository.save(profile);
		}
	}

	private static String withoutOwner(String securityRoles) {
		Set<String> roles = new LinkedHashSet<>(VelvetUserPrincipal.parseRoleStrings(securityRoles));
		roles.remove("OWNER");
		return joinRoles(roles);
	}

	private static String joinRoles(Set<String> roles) {
		if (roles.isEmpty()) {
			return "CLIENT";
		}
		return String.join(",", roles);
	}

	private static String ensureStaffRoleForLinkedOperator(String securityRoles) {
		Set<String> roles = new LinkedHashSet<>(VelvetUserPrincipal.parseRoleStrings(securityRoles));
		if (!roles.contains("STAFF")) {
			roles.add("STAFF");
		}
		return joinRoles(roles);
	}
}
