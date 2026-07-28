package it.luxury.security.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.config.LuxurySecurityProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiting in-memory per endpoint sensibili (login, refresh, reset password).
 * In produzione multi-istanza preferire Redis/Bucket4j dietro nginx {@code limit_req}.
 */
@Component
public class LuxuryAuthRateLimitFilter extends OncePerRequestFilter {

	private final LuxurySecurityProperties securityProperties;
	private final ObjectMapper objectMapper;
	private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

	public LuxuryAuthRateLimitFilter(LuxurySecurityProperties securityProperties, ObjectMapper objectMapper) {
		this.securityProperties = securityProperties;
		this.objectMapper = objectMapper;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		if (!securityProperties.rateLimitEnabled()) {
			return true;
		}
		String path = request.getRequestURI();
		return !path.startsWith("/api/v1/auth/");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		String key = clientKey(request);
		int limit = securityProperties.rateLimitRequestsPerMinute();
		long windowStart = Instant.now().getEpochSecond() / 60;
		Window window = windows.compute(key, (k, existing) -> {
			if (existing == null || existing.windowStart != windowStart) {
				return new Window(windowStart, new AtomicInteger(0));
			}
			return existing;
		});
		int count = window.counter.incrementAndGet();
		if (count > limit) {
			response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			objectMapper.writeValue(
					response.getOutputStream(),
					Map.of(
							"code", "RATE_LIMIT_EXCEEDED",
							"message", "Troppe richieste. Riprova tra qualche minuto."));
			return;
		}
		filterChain.doFilter(request, response);
	}

	private static String clientKey(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		String ip;
		if (forwarded != null && !forwarded.isBlank()) {
			int comma = forwarded.indexOf(',');
			ip = (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
		}
		else {
			ip = request.getRemoteAddr();
		}
		return ip + ":" + request.getRequestURI();
	}

	private record Window(long windowStart, AtomicInteger counter) {
	}
}
