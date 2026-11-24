package it.luxury.security.api;

import it.luxury.common.api.BusinessException;
import it.luxury.security.auth.LuxuryRefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

@Component
public class LuxuryRefreshTokenCookieSupport {

	/** Non è un segreto: dice alle altre origini che esiste una sessione da rinnovare via cookie. */
	public static final String SESSION_MARKER_COOKIE = "luxury_session";

	private final String cookieDomain;

	public LuxuryRefreshTokenCookieSupport(
			@Value("${luxury.security.refresh-cookie-domain:}") String refreshCookieDomain) {
		this.cookieDomain = normalizeCookieDomain(refreshCookieDomain);
	}

	public String readRefreshToken(HttpServletRequest request) {
		if (request.getCookies() == null) {
			return null;
		}
		for (Cookie cookie : request.getCookies()) {
			if (LuxuryRefreshTokenService.REFRESH_COOKIE_NAME.equals(cookie.getName())) {
				String value = cookie.getValue();
				return value != null && !value.isBlank() ? value.trim() : null;
			}
		}
		return null;
	}

	public void writeRefreshCookie(HttpServletResponse response, String rawRefreshToken, int maxAgeDays, boolean secure) {
		response.addHeader("Set-Cookie", refreshCookie(rawRefreshToken, maxAgeDays, secure).toString());
		response.addHeader("Set-Cookie", sessionMarkerCookie(UUID.randomUUID().toString(), maxAgeDays, secure).toString());
	}

	public void clearRefreshCookie(HttpServletResponse response, boolean secure) {
		response.addHeader("Set-Cookie", refreshCookie("", 0, secure).toString());
		response.addHeader("Set-Cookie", sessionMarkerCookie("", 0, secure).toString());
	}

	private ResponseCookie refreshCookie(String value, int maxAgeDays, boolean secure) {
		ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(LuxuryRefreshTokenService.REFRESH_COOKIE_NAME, value)
				.httpOnly(true)
				.secure(secure)
				.sameSite("Strict")
				.path("/api/v1/auth")
				.maxAge(Duration.ofDays(Math.max(maxAgeDays, 0)));
		return applyDomain(builder).build();
	}

	private ResponseCookie sessionMarkerCookie(String value, int maxAgeDays, boolean secure) {
		ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(SESSION_MARKER_COOKIE, value)
				.httpOnly(false)
				.secure(secure)
				.sameSite("Strict")
				.path("/")
				.maxAge(Duration.ofDays(Math.max(maxAgeDays, 0)));
		return applyDomain(builder).build();
	}

	private ResponseCookie.ResponseCookieBuilder applyDomain(ResponseCookie.ResponseCookieBuilder builder) {
		if (cookieDomain != null) {
			builder.domain(cookieDomain);
		}
		return builder;
	}

	static String normalizeCookieDomain(String raw) {
		if (raw == null) {
			return null;
		}
		String trimmed = raw.trim();
		if (trimmed.startsWith(".")) {
			trimmed = trimmed.substring(1);
		}
		if (trimmed.isEmpty() || trimmed.matches("\\d{1,3}(\\.\\d{1,3}){3}")) {
			return null;
		}
		if (!trimmed.matches("(?i)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+")) {
			return null;
		}
		return trimmed.toLowerCase();
	}

	public boolean isSecureRequest(HttpServletRequest request) {
		if (request.isSecure()) {
			return true;
		}
		String proto = request.getHeader("X-Forwarded-Proto");
		return proto != null && "https".equalsIgnoreCase(proto.trim());
	}

	public void requireHttpsForCookieAuth(HttpServletRequest request) {
		if (!isSecureRequest(request)) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"HTTPS_REQUIRED",
					"L’autenticazione con cookie richiede HTTPS.");
		}
	}
}
