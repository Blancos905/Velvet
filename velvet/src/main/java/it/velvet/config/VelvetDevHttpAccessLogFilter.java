package it.velvet.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Se attivato, registra in log ogni richiesta HTTP che arriva a Tomcat e lo status finale.
 * Utile quando il browser mostra 500 ma in console Spring non compare nessuno stack trace:
 * in quel caso spesso la richiesta <strong>non</strong> raggiunge l’app (proxy Vite, URL sbagliato, altro host).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnProperty(prefix = "velvet.dev", name = "http-access-log", havingValue = "true")
public class VelvetDevHttpAccessLogFilter extends OncePerRequestFilter {

	private static final Logger log = LoggerFactory.getLogger(VelvetDevHttpAccessLogFilter.class);

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		long t0 = System.nanoTime();
		try {
			filterChain.doFilter(request, response);
		}
		finally {
			long ms = (System.nanoTime() - t0) / 1_000_000L;
			log.info(
					"HTTP {} {} -> {} ({} ms) da {}",
					request.getMethod(),
					request.getRequestURI(),
					response.getStatus(),
					ms,
					request.getRemoteAddr());
		}
	}
}
