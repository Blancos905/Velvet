package it.velvet.consumer.service;

import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSecurityProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.audit.SecurityAuditService;
import it.velvet.security.auth.VelvetRefreshTokenService;
import it.velvet.security.auth.VelvetTokenService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class VelvetAuthLoginService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;
	private final VelvetTokenService velvetTokenService;
	private final VelvetRefreshTokenService velvetRefreshTokenService;
	private final VelvetSecurityProperties securityProperties;
	private final SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService;
	private final SecurityAuditService securityAuditService;
	private final VelvetEmailVerificationService velvetEmailVerificationService;

	public VelvetAuthLoginService(
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder,
			VelvetTokenService velvetTokenService,
			VelvetRefreshTokenService velvetRefreshTokenService,
			VelvetSecurityProperties securityProperties,
			SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService,
			SecurityAuditService securityAuditService,
			VelvetEmailVerificationService velvetEmailVerificationService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
		this.velvetTokenService = velvetTokenService;
		this.velvetRefreshTokenService = velvetRefreshTokenService;
		this.securityProperties = securityProperties;
		this.salonOwnerRoleAlignmentService = salonOwnerRoleAlignmentService;
		this.securityAuditService = securityAuditService;
		this.velvetEmailVerificationService = velvetEmailVerificationService;
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
			velvetEmailVerificationService.assertMayLogin(p);
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
		VelvetRefreshTokenService.RefreshTokenPair tokens = velvetRefreshTokenService.issueForProfile(forToken, request);
		securityAuditService.record("AUTH_LOGIN", "SUCCESS", forToken.getKeycloakSub(), forToken.getId(), request, null);
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
