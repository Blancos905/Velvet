package it.luxury.security.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Utente autenticato via JWT firmato da Luxury (claim {@code sub} = {@code consumer_profiles.auth_sub}).
 */
public final class LuxuryUserPrincipal implements UserDetails {

	private static final Set<String> KNOWN_APP_ROLES = Set.of("CLIENT", "OWNER", "STAFF", "ADMIN");

	/** Può essere assente se il token non include il claim {@code uid}. */
	private final UUID profileId;
	private final String subject;
	private final String email;
	private final Collection<? extends GrantedAuthority> authorities;

	public LuxuryUserPrincipal(UUID profileId, String subject, String email, Collection<String> appRoles) {
		this.profileId = profileId;
		this.subject = subject;
		this.email = email != null ? email : "";
		this.authorities = ensureKnownAppRoles(appRoles).stream()
				.map(r -> new SimpleGrantedAuthority("ROLE_" + r))
				.map(GrantedAuthority.class::cast)
				.toList();
	}

	/** Normalizza claim legacy (es. {@code ROLE_OWNER} → {@code OWNER}). */
	public static String normalizeAppRoleName(String role) {
		if (role == null || role.isBlank()) {
			return "";
		}
		String r = role.trim().toUpperCase(Locale.ROOT);
		if (r.startsWith("ROLE_")) {
			r = r.substring(5);
		}
		return r;
	}

	/**
	 * Se il JWT contiene solo ruoli non riconosciuti (token legacy con ruoli non Luxury), fallback {@code CLIENT}
	 * così {@code @PreAuthorize} non risponde 403 con sessione altrimenti valida.
	 */
	public static List<String> ensureKnownAppRoles(Collection<String> roles) {
		List<String> normalized = roles.stream()
				.filter(r -> r != null && !r.isBlank())
				.map(LuxuryUserPrincipal::normalizeAppRoleName)
				.filter(r -> !r.isEmpty())
				.distinct()
				.toList();
		if (normalized.stream().anyMatch(KNOWN_APP_ROLES::contains)) {
			return normalized;
		}
		return List.of("CLIENT");
	}

	public UUID getProfileId() {
		return profileId;
	}

	/** Stabile: stesso valore persistito su {@code consumer_profiles.auth_sub} e correlazione titolare salone. */
	public String getSubject() {
		return subject;
	}

	public String getEmail() {
		return email;
	}

	public boolean hasAppRole(String role) {
		return getAuthorities().contains(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase(Locale.ROOT)));
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return authorities;
	}

	@Override
	public String getPassword() {
		return "";
	}

	@Override
	public String getUsername() {
		return email.isBlank() ? subject : email;
	}

	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	@Override
	public boolean isAccountNonLocked() {
		return true;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	@Override
	public boolean isEnabled() {
		return true;
	}

	public static List<String> parseRoleStrings(String securityRoles) {
		if (securityRoles == null || securityRoles.isBlank()) {
			return List.of("CLIENT");
		}
		List<String> parsed = List.of(securityRoles.split(",")).stream()
				.map(LuxuryUserPrincipal::normalizeAppRoleName)
				.filter(s -> !s.isEmpty())
				.distinct()
				.toList();
		return parsed.isEmpty() ? List.of("CLIENT") : parsed;
	}
}
