package it.velvet.security.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Utente autenticato via JWT firmato da Velvet (claim {@code sub} = {@code consumer_profiles.keycloak_sub}).
 */
public final class VelvetUserPrincipal implements UserDetails {

	/** Può essere assente se il token non include il claim {@code uid}. */
	private final UUID profileId;
	private final String subject;
	private final String email;
	private final Collection<? extends GrantedAuthority> authorities;

	public VelvetUserPrincipal(UUID profileId, String subject, String email, Collection<String> appRoles) {
		this.profileId = profileId;
		this.subject = subject;
		this.email = email != null ? email : "";
		this.authorities = appRoles.stream()
				.filter(r -> r != null && !r.isBlank())
				.map(r -> r.trim().toUpperCase(Locale.ROOT))
				.map(r -> new SimpleGrantedAuthority("ROLE_" + r))
				.map(GrantedAuthority.class::cast)
				.toList();
	}

	public UUID getProfileId() {
		return profileId;
	}

	/** Stabile: stesso valore persistito su {@code consumer_profiles.keycloak_sub} e correlazione titolare salone. */
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
				.map(s -> s.trim().toUpperCase(Locale.ROOT))
				.filter(s -> !s.isEmpty())
				.toList();
		return parsed.isEmpty() ? List.of("CLIENT") : parsed;
	}
}
