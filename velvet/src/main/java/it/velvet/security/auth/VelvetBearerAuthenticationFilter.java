package it.velvet.security.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class VelvetBearerAuthenticationFilter extends OncePerRequestFilter {

	private final VelvetTokenService tokenService;

	public VelvetBearerAuthenticationFilter(VelvetTokenService tokenService) {
		this.tokenService = tokenService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
			String raw = header.substring(7).trim();
			tokenService.parseAndValidate(raw).ifPresent(principal -> SecurityContextHolder.getContext().setAuthentication(
					new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())));
		}
		filterChain.doFilter(request, response);
	}
}
