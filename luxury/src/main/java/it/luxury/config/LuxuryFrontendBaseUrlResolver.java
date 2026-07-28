package it.luxury.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Base URL frontend per link email (conferma, checkout): preferisce l'origine della richiesta
 * HTTP (WebView app o browser) quando è attendibile, altrimenti {@code luxury.notifications.frontend-base-url}.
 */
@Component
public class LuxuryFrontendBaseUrlResolver {

	private static final String HEADER_FRONTEND_ORIGIN = "X-Luxury-Frontend-Origin";
	private static final Pattern PRIVATE_LAN_HOST = Pattern.compile(
			"^(localhost|127\\.0\\.0\\.1|10\\.0\\.2\\.2|192\\.168\\.\\d{1,3}\\.\\d{1,3})$",
			Pattern.CASE_INSENSITIVE);

	private final LuxuryNotificationProperties notificationProperties;
	private final Environment environment;

	public LuxuryFrontendBaseUrlResolver(
			LuxuryNotificationProperties notificationProperties,
			Environment environment) {
		this.notificationProperties = notificationProperties;
		this.environment = environment;
	}

	public String resolve() {
		String configured = trimTrailingSlashes(notificationProperties.getFrontendBaseUrl());
		HttpServletRequest request = currentRequest();
		if (request == null) {
			return configured;
		}
		String candidate = firstNonBlank(
				request.getHeader(HEADER_FRONTEND_ORIGIN),
				request.getHeader("Origin"),
				originFromReferer(request.getHeader("Referer")));
		if (candidate != null && isTrustedFrontendOrigin(candidate)) {
			String trimmedCandidate = trimTrailingSlashes(candidate);
			// Dev: registrazione da browser su localhost — link email con IP LAN (apribile da telefono).
			if (isLocalDevProfile() && isLoopbackOrigin(trimmedCandidate) && isPrivateLanConfiguredBase(configured)) {
				return configured;
			}
			return trimmedCandidate;
		}
		return configured;
	}

	private HttpServletRequest currentRequest() {
		var attributes = RequestContextHolder.getRequestAttributes();
		if (attributes instanceof ServletRequestAttributes servletAttributes) {
			return servletAttributes.getRequest();
		}
		return null;
	}

	private boolean isTrustedFrontendOrigin(String rawOrigin) {
		if (rawOrigin == null || rawOrigin.isBlank()) {
			return false;
		}
		try {
			URI origin = URI.create(rawOrigin.trim());
			if (!"http".equalsIgnoreCase(origin.getScheme()) && !"https".equalsIgnoreCase(origin.getScheme())) {
				return false;
			}
			String host = origin.getHost();
			if (host == null || host.isBlank()) {
				return false;
			}
			String normalizedHost = host.toLowerCase(Locale.ROOT);
			if (normalizedHost.equals("saloniluxury.it") || normalizedHost.equals("www.saloniluxury.it")) {
				return true;
			}
			if (isLocalDevProfile()) {
				if (PRIVATE_LAN_HOST.matcher(normalizedHost).matches()) {
					return true;
				}
			}
			URI configured = URI.create(notificationProperties.getFrontendBaseUrl().trim());
			String configuredHost = configured.getHost();
			if (configuredHost != null && normalizedHost.equals(configuredHost.toLowerCase(Locale.ROOT))) {
				return portsCompatible(origin, configured);
			}
			return false;
		}
		catch (IllegalArgumentException ex) {
			return false;
		}
	}

	private boolean isLocalDevProfile() {
		return environment.acceptsProfiles(Profiles.of("local", "docker"));
	}

	private static boolean isLoopbackOrigin(String origin) {
		try {
			String host = URI.create(origin.trim()).getHost();
			if (host == null) {
				return false;
			}
			String normalized = host.toLowerCase(Locale.ROOT);
			return normalized.equals("localhost") || normalized.equals("127.0.0.1");
		}
		catch (IllegalArgumentException ex) {
			return false;
		}
	}

	private static boolean isPrivateLanConfiguredBase(String configured) {
		try {
			String host = URI.create(configured.trim()).getHost();
			if (host == null || host.isBlank()) {
				return false;
			}
			return PRIVATE_LAN_HOST.matcher(host.toLowerCase(Locale.ROOT)).matches()
					&& !host.equalsIgnoreCase("localhost")
					&& !host.equals("127.0.0.1");
		}
		catch (IllegalArgumentException ex) {
			return false;
		}
	}

	private static boolean portsCompatible(URI origin, URI configured) {
		int originPort = origin.getPort();
		int configuredPort = configured.getPort();
		if (originPort < 0) {
			originPort = "https".equalsIgnoreCase(origin.getScheme()) ? 443 : 80;
		}
		if (configuredPort < 0) {
			configuredPort = "https".equalsIgnoreCase(configured.getScheme()) ? 443 : 80;
		}
		return originPort == configuredPort;
	}

	private static String originFromReferer(String referer) {
		if (referer == null || referer.isBlank()) {
			return null;
		}
		try {
			URI uri = URI.create(referer.trim());
			if (uri.getScheme() == null || uri.getHost() == null) {
				return null;
			}
			int port = uri.getPort();
			String portPart = port > 0 ? ":" + port : "";
			return uri.getScheme() + "://" + uri.getHost() + portPart;
		}
		catch (IllegalArgumentException ex) {
			return null;
		}
	}

	private static String firstNonBlank(String... values) {
		if (values == null) {
			return null;
		}
		for (String value : values) {
			if (value != null && !value.isBlank()) {
				return value.trim();
			}
		}
		return null;
	}

	private static String trimTrailingSlashes(String base) {
		if (base == null) {
			return "";
		}
		return base.replaceAll("/+$", "");
	}
}
