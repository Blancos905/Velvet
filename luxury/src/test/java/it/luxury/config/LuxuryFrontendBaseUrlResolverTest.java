package it.luxury.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;

class LuxuryFrontendBaseUrlResolverTest {

	private LuxuryNotificationProperties notificationProperties;
	private MockEnvironment environment;

	@BeforeEach
	void setUp() {
		notificationProperties = new LuxuryNotificationProperties();
		notificationProperties.setFrontendBaseUrl("http://192.168.1.55:5173");
		environment = new MockEnvironment();
		environment.setActiveProfiles("local");
	}

	@AfterEach
	void tearDown() {
		RequestContextHolder.resetRequestAttributes();
	}

	@Test
	void resolve_prefersTrustedOriginOverConfiguredBase() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.addHeader("Origin", "http://192.168.1.63:5173");
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

		var resolver = new LuxuryFrontendBaseUrlResolver(notificationProperties, environment);

		assertThat(resolver.resolve()).isEqualTo("http://192.168.1.63:5173");
	}

	@Test
	void resolve_usesCustomHeaderWhenPresent() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.addHeader("X-Luxury-Frontend-Origin", "http://192.168.1.63:5173");
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

		var resolver = new LuxuryFrontendBaseUrlResolver(notificationProperties, environment);

		assertThat(resolver.resolve()).isEqualTo("http://192.168.1.63:5173");
	}

	@Test
	void resolve_fallsBackToConfiguredWhenOriginUntrusted() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.addHeader("Origin", "https://evil.example");
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

		var resolver = new LuxuryFrontendBaseUrlResolver(notificationProperties, environment);

		assertThat(resolver.resolve()).isEqualTo("http://192.168.1.55:5173");
	}

	@Test
	void resolve_localhostOriginUsesConfiguredLanBaseInDev() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.addHeader("Origin", "http://localhost:5173");
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

		var resolver = new LuxuryFrontendBaseUrlResolver(notificationProperties, environment);

		assertThat(resolver.resolve()).isEqualTo("http://192.168.1.55:5173");
	}

	@Test
	void resolve_acceptsProductionHost() {
		notificationProperties.setFrontendBaseUrl("https://saloniluxury.it");
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.addHeader("Origin", "https://www.saloniluxury.it");
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

		var resolver = new LuxuryFrontendBaseUrlResolver(notificationProperties, environment);

		assertThat(resolver.resolve()).isEqualTo("https://www.saloniluxury.it");
	}
}
