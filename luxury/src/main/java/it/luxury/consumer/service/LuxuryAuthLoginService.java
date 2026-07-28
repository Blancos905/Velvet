package it.luxury.consumer.service;

import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.audit.SecurityAuditService;
import it.luxury.security.auth.LuxuryRefreshTokenService;
import it.luxury.security.auth.LuxuryTokenService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class LuxuryAuthLoginService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;
	private final LuxuryTokenService luxuryTokenService;
	private final LuxuryRefreshTokenService luxuryRefreshTokenService;
	private final LuxurySecurityProperties securityProperties;
	private final SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService;
	private final SecurityAuditService securityAuditService;
	private final LuxuryEmailVerificationService luxuryEmailVerificationService;

	public LuxuryAuthLoginService(
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder,
			LuxuryTokenService luxuryTokenService,
			LuxuryRefreshTokenService luxuryRefreshTokenService,
			LuxurySecurityProperties securityProperties,
			SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService,
			SecurityAuditService securityAuditService,
			LuxuryEmailVerificationService luxuryEmailVerificationService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
		this.luxuryTokenService = luxuryTokenService;
		this.luxuryRefreshTokenService = luxuryRefreshTokenService;
		this.securityProperties = securityProperties;
		this.salonOwnerRoleAlignmentService = salonOwnerRoleAlignmentService;
		this.securityAuditService = securityAuditService;
		this.luxuryEmailVerificationService = luxuryEmailVerificationService;
	}

	public AuthLoginResult login(String email, String password, HttpServletRequest request) {
		String norm = email != null ? email.trim().toLowerCase(Locale.ROOT) : "";
		if (norm.isEmpty() || password == null || password.isEmpty()) {
			securityAuditService.record("AUTH_LOGIN", "FAIL", norm, null, request, "missing_credentials");
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email o password non validi.");
		}
		ConsumerProfile p = consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(norm)
				.orElse(null);
		if (p == null || p.getDeletedAt() != null
				|| p.getPasswordHash() == null
				|| !passwordEncoder.matches(password, p.getPasswordHash())) {
			securityAuditService.record("AUTH_LOGIN", "FAIL", norm, p != null ? p.getId() : null, request, "invalid_credentials");
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email o password non validi.");
		}
		try {
			luxuryEmailVerificationService.assertMayLogin(p);
		}
		catch (BusinessException ex) {
			securityAuditService.record(
					"AUTH_LOGIN",
					"FAIL",
					norm,
					p.getId(),
					request,
					ex.getCode() != null ? ex.getCode() : "email_not_verified");
			throw ex;
		}
		salonOwnerRoleAlignmentService.alignAfterSuccessfulPasswordLogin(p);
		ConsumerProfile forToken = consumerProfileRepository.findById(p.getId()).orElse(p);
		LuxuryRefreshTokenService.RefreshTokenPair tokens = luxuryRefreshTokenService.issueForProfile(forToken, request);
		securityAuditService.record("AUTH_LOGIN", "SUCCESS", forToken.getAuthSub(), forToken.getId(), request, null);
		return new AuthLoginResult(
				tokens.accessToken(),
				tokens.refreshToken(),
				tokens.expiresInSeconds(),
				securityProperties.refreshTokenTtlDays());
	}

	public record AuthLoginResult(
			String accessToken,
			String refreshToken,
			long expiresInSeconds,
			int refreshTokenExpiresInDays) {
	}
}
