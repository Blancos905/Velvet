package it.velvet.security.api;

import it.velvet.common.api.BusinessException;
import it.velvet.security.auth.VelvetRefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class VelvetRefreshTokenCookieSupport {

	public String readRefreshToken(HttpServletRequest request) {
		if (request.getCookies() == null) {
			return null;
		}
		for (Cookie cookie : request.getCookies()) {
			if (VelvetRefreshTokenService.REFRESH_COOKIE_NAME.equals(cookie.getName())) {
				String value = cookie.getValue();
				return value != null && !value.isBlank() ? value.trim() : null;
			}
		}
		return null;
	}

	public void writeRefreshCookie(HttpServletResponse response, String rawRefreshToken, int maxAgeDays, boolean secure) {
		ResponseCookie cookie = ResponseCookie.from(VelvetRefreshTokenService.REFRESH_COOKIE_NAME, rawRefreshToken)
				.httpOnly(true)
				.secure(secure)
				.sameSite("Strict")
				.path("/api/v1/auth")
				.maxAge(Duration.ofDays(maxAgeDays))
				.build();
		response.addHeader("Set-Cookie", cookie.toString());
	}

	public void clearRefreshCookie(HttpServletResponse response, boolean secure) {
		ResponseCookie cookie = ResponseCookie.from(VelvetRefreshTokenService.REFRESH_COOKIE_NAME, "")
				.httpOnly(true)
				.secure(secure)
				.sameSite("Strict")
				.path("/api/v1/auth")
				.maxAge(0)
				.build();
		response.addHeader("Set-Cookie", cookie.toString());
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
