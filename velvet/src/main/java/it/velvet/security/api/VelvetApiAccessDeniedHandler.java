package it.velvet.security.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.velvet.common.api.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Risposte JSON per API con autenticazione insufficiente (es. ruolo CLIENT su endpoint titolare).
 */
@Component
public class VelvetApiAccessDeniedHandler implements AccessDeniedHandler {

	private final ObjectMapper objectMapper;

	public VelvetApiAccessDeniedHandler(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	public void handle(
			HttpServletRequest request,
			HttpServletResponse response,
			AccessDeniedException accessDeniedException)
			throws IOException {
		if (!isApiPath(request)) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}
		response.setStatus(HttpServletResponse.SC_FORBIDDEN);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		objectMapper.writeValue(
				response.getWriter(),
				new ApiError("FORBIDDEN", "Permessi insufficienti per questa operazione.", null));
	}

	private static boolean isApiPath(HttpServletRequest request) {
		String uri = request.getRequestURI();
		return uri != null && uri.startsWith("/api/");
	}
}
